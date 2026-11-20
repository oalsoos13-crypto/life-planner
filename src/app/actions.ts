"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { COOKIE, passwordMatches, sessionToken } from "@/lib/auth";
import { assertEditableWeek, getContext } from "@/lib/week";
import { addDays, isValidYmd, toDate, toYmd } from "@/lib/dates";
import type { Status } from "@prisma/client";
import { clampProgress, normalizeWeekDay, recurrenceCollisions, remapWeekStart, statusAfterStep, statusPatch } from "@/modules/execution";

// ===== الدخول =====
export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const pw = String(formData.get("password") || "");
  if (!(await passwordMatches(pw))) return "wrong";
  (await cookies()).set(COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// ===== المهام الأسبوعية =====
function refresh() {
  revalidatePath("/", "layout");
}

async function editableTask(id: string) {
  const t = await prisma.weeklyTask.findUniqueOrThrow({ where: { id } });
  await assertEditableWeek(t.weekStart);
  return t;
}

// لما المهمة مربوطة بخطوة من الخطة، حالتها بتمشي معها
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
async function syncPlan(tx: Tx, t: { planSubtaskId: string | null; planStepId: string | null }, status: Status) {
  if (t.planStepId) await tx.planStep.update({ where: { id: t.planStepId }, data: { status } });
  if (t.planSubtaskId) await tx.planSubtask.update({ where: { id: t.planSubtaskId }, data: { status } });
}

export async function createTask(input: { weekStart: string; title: string; goalId: string | null; repeat?: boolean }) {
  const title = input.title.trim();
  if (!title || !isValidYmd(input.weekStart)) return;
  await assertEditableWeek(input.weekStart);
  const ws = toDate(input.weekStart);
  let recurrenceId: string | null = null;
  if (input.repeat) {
    const r = await prisma.recurrence.create({ data: { title, goalId: input.goalId, startWeek: ws, steps: [] } });
    recurrenceId = r.id;
  }
  const max = await prisma.weeklyTask.aggregate({ where: { weekStart: ws }, _max: { order: true } });
  await prisma.weeklyTask.create({
    data: {
      weekStart: ws,
      title,
      goalId: input.goalId || null,
      recurrenceId,
      order: Math.min((max._max.order ?? 0) + 1, 999),
      touchedAt: new Date(),
    },
  });
  refresh();
}

export async function updateTask(
  id: string,
  data: { title?: string; goalId?: string | null; notes?: string | null; progress?: number | null; imageData?: string | null }
) {
  await editableTask(id);
  const clean: typeof data = { ...data };
  if (clean.title !== undefined) {
    clean.title = clean.title.trim();
    if (!clean.title) delete clean.title;
  }
  if (clean.progress != null) clean.progress = clampProgress(clean.progress);
  if (clean.imageData && clean.imageData.length > 1_500_000) throw new Error("الصورة كبيرة");
  await prisma.weeklyTask.update({ where: { id }, data: { ...clean, touchedAt: new Date() } });
  refresh();
}

export async function setStatus(id: string, status: Status) {
  const t = await editableTask(id);
  // القواعد بالمجال (execution/domain/weeklyTask.ts)، والتغييرين بمعاملة وحدة
  await prisma.$transaction(async (tx) => {
    await tx.weeklyTask.update({ where: { id }, data: { ...statusPatch(status, new Date()), touchedAt: new Date() } });
    await syncPlan(tx, t, status);
  });
  refresh();
}

export async function setStuck(id: string, stuck: boolean, note?: string) {
  await editableTask(id);
  await prisma.weeklyTask.update({
    where: { id },
    data: { stuck, stuckNote: stuck ? note?.trim() || null : null, touchedAt: new Date() },
  });
  refresh();
}

export async function cancelTask(id: string, reason: string) {
  await editableTask(id);
  await prisma.weeklyTask.update({
    where: { id },
    data: { cancelledAt: new Date(), cancelReason: reason.trim() || null, stuck: false, touchedAt: new Date() },
  });
  refresh();
}

export async function restoreTask(id: string) {
  await editableTask(id);
  await prisma.weeklyTask.update({ where: { id }, data: { cancelledAt: null, cancelReason: null, touchedAt: new Date() } });
  refresh();
}

export async function deleteTask(id: string) {
  await editableTask(id);
  await prisma.weeklyTask.delete({ where: { id } });
  refresh();
}

export async function addStep(taskId: string, title: string) {
  await editableTask(taskId);
  if (!title.trim()) return;
  const n = await prisma.weeklyTaskStep.count({ where: { taskId } });
  await prisma.weeklyTaskStep.create({ data: { taskId, title: title.trim(), order: n } });
  await prisma.weeklyTask.update({ where: { id: taskId }, data: { touchedAt: new Date() } });
  refresh();
}

export async function toggleStep(stepId: string, done: boolean) {
  const s = await prisma.weeklyTaskStep.findUniqueOrThrow({ where: { id: stepId } });
  const t = await editableTask(s.taskId);
  await prisma.weeklyTaskStep.update({ where: { id: stepId }, data: { done } });
  // إذا بلّشت بالخطوات والمهمة لسا ما بلّشت، بتصير «ماشية»
  await prisma.weeklyTask.update({ where: { id: t.id }, data: { touchedAt: new Date(), status: statusAfterStep(t.status, done) } });
  refresh();
}

export async function deleteStep(stepId: string) {
  const s = await prisma.weeklyTaskStep.findUniqueOrThrow({ where: { id: stepId } });
  await editableTask(s.taskId);
  await prisma.weeklyTaskStep.delete({ where: { id: stepId } });
  refresh();
}

// ===== التكرار =====
export async function startRepeat(taskId: string) {
  const t = await editableTask(taskId);
  if (t.recurrenceId) return;
  const steps = await prisma.weeklyTaskStep.findMany({ where: { taskId }, orderBy: { order: "asc" } });
  const r = await prisma.recurrence.create({
    data: { title: t.title, goalId: t.goalId, notes: t.notes, startWeek: t.weekStart, steps: steps.map((s) => s.title) },
  });
  await prisma.weeklyTask.update({ where: { id: taskId }, data: { recurrenceId: r.id, touchedAt: new Date() } });
  refresh();
}

export async function stopRepeat(taskId: string) {
  const t = await editableTask(taskId);
  if (!t.recurrenceId) return;
  const stopAt = toDate(addDays(toYmd(t.weekStart), 7));
  await prisma.recurrence.update({ where: { id: t.recurrenceId }, data: { stoppedAt: stopAt } });
  // نشيل النسخ الجاية الي انعملت لحالها وما لمستها
  await prisma.weeklyTask.deleteMany({
    where: { recurrenceId: t.recurrenceId, weekStart: { gte: stopAt }, isAuto: true, touchedAt: null },
  });
  refresh();
}

// ===== مراجعة الأسبوع =====
export async function saveReview(weekStart: string, learned: string, top3: string[]) {
  if (!isValidYmd(weekStart)) return;
  await prisma.weekReview.upsert({
    where: { weekStart: toDate(weekStart) },
    update: { learned, top3 },
    create: { weekStart: toDate(weekStart), learned, top3, seenAt: new Date() },
  });
  refresh();
}

// ===== الإعدادات =====
export async function updateSettings(data: { weekStartDay?: number; locale?: string; theme?: string }) {
  const { settings } = await getContext();
  if (data.locale && !["ar", "en"].includes(data.locale)) delete data.locale;
  if (data.theme && !["system", "light", "dark"].includes(data.theme)) delete data.theme;
  if (data.weekStartDay === undefined || normalizeWeekDay(data.weekStartDay) === settings.weekStartDay) {
    delete data.weekStartDay;
    await prisma.settings.update({ where: { id: 1 }, data });
    refresh();
    return;
  }
  const day = normalizeWeekDay(data.weekStartDay);
  // كل التحريك بمعاملة وحدة: يا بيتحرك كل شي يا ولا شي (DDIA: الذرّية).
  // وأي خطأ بيطلع واضح بدل ما ينبلع (Pragmatic: «البرامج الميتة ما بتكذب»).
  await prisma.$transaction(
    async (tx) => {
      const tasks = await tx.weeklyTask.findMany({ select: { id: true, weekStart: true, recurrenceId: true, isAuto: true, touchedAt: true } });
      const moved = tasks.map((t) => ({ ...t, newWeek: remapWeekStart(toYmd(t.weekStart), day), touched: !!t.touchedAt }));
      const drop = new Set(recurrenceCollisions(moved));
      if (drop.size) await tx.weeklyTask.deleteMany({ where: { id: { in: [...drop] } } });
      // كل الأسابيع على نفس اليوم القديم بتنزاح بنفس المسافة، فما في أسبوعين بيوقعوا على بعض
      for (const t of moved) {
        if (drop.has(t.id) || t.newWeek === toYmd(t.weekStart)) continue;
        await tx.weeklyTask.update({ where: { id: t.id }, data: { weekStart: toDate(t.newWeek) } });
      }
      const recs = await tx.recurrence.findMany();
      for (const r of recs) {
        await tx.recurrence.update({
          where: { id: r.id },
          data: {
            startWeek: toDate(remapWeekStart(toYmd(r.startWeek), day)),
            stoppedAt: r.stoppedAt ? toDate(remapWeekStart(toYmd(r.stoppedAt), day)) : null,
          },
        });
      }
      await tx.settings.update({ where: { id: 1 }, data: { ...data, weekStartDay: day } });
    },
    { timeout: 60000 }
  );
  refresh();
}
