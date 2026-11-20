import "server-only";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { JOB_KINDS, nextWeekly, onClaim, onReport, onUser, safeSummary, standingAllowed, type AgentReport, type JobKind, type JobStatus, type UserAction } from "../domain/job";

export type JobInput = { kind: JobKind; title: string; instructions: string; folder?: string | null; repeatDay?: number | null; standing?: boolean };

export async function createJob(i: JobInput): Promise<Result<void>> {
  if (!JOB_KINDS.includes(i.kind)) return err("KIND", "نوع مش معروف");
  const title = i.title.trim().slice(0, 120);
  const instructions = i.instructions.trim().slice(0, 4000);
  if (!title || !instructions) return err("EMPTY", "اكتب عنوان وشو بدك يعمل");
  const repeatDay = i.repeatDay != null && i.repeatDay >= 0 && i.repeatDay <= 6 ? i.repeatDay : null;
  const standing = !!i.standing && standingAllowed(i.kind, repeatDay);
  await prisma.agentJob.create({
    data: { kind: i.kind, title, instructions, folder: i.folder?.trim().slice(0, 200) || null, repeatDay, standing, nextRunAt: repeatDay != null ? nextWeekly(repeatDay, new Date()) : null, status: repeatDay != null ? "DONE" : "QUEUED" },
  });
  return ok(undefined);
}

export async function act(id: string, a: UserAction): Promise<Result<void>> {
  const j = await prisma.agentJob.findUnique({ where: { id } });
  if (!j) return err("NOT_FOUND", "المهمة مش موجودة");
  const to = onUser(j.status as JobStatus, a);
  if (!to) return err("STATE", "ما بينفع هلّق");
  // RETRY لتقرير متكرّر = شغّله هلّق
  await prisma.agentJob.update({ where: { id }, data: { status: to, ...(to === "QUEUED" ? { summary: null, finishedAt: null } : {}) } });
  return ok(undefined);
}

export async function setStanding(id: string, standing: boolean): Promise<Result<void>> {
  const j = await prisma.agentJob.findUnique({ where: { id } });
  if (!j) return err("NOT_FOUND", "المهمة مش موجودة");
  if (standing && !standingAllowed(j.kind as JobKind, j.repeatDay)) return err("NOT_ALLOWED", "الإذن الدائم بس للتقارير الأسبوعية");
  await prisma.agentJob.update({ where: { id }, data: { standing } });
  return ok(undefined);
}

export async function removeJob(id: string) {
  await prisma.agentJob.deleteMany({ where: { id, status: { notIn: ["RUNNING", "SENDING"] } } });
}

// ── واجهة اللابتوب (توكن، مش كوكي الدخول) ──
export function tokenOk(header: string | null): boolean {
  const want = process.env.AGENT_TOKEN;
  if (!want || want.length < 24 || !header?.startsWith("Bearer ")) return false;
  const got = Buffer.from(header.slice(7)), exp = Buffer.from(want);
  return got.length === exp.length && timingSafeEqual(got, exp);
}

/** اللابتوب بيسأل «شو في؟»: بيصحّي التقارير الي إجا وقتها، وبيستلم أقدم مهمة جاهزة */
export async function claimNext() {
  const now = new Date();
  await prisma.settings.update({ where: { id: 1 }, data: { agentSeenAt: now } });
  // المهام الي علقت أكتر من ساعة (اللابتوب انطفى بالنص) بترجع للدور
  const stale = new Date(now.getTime() - 60 * 60_000);
  await prisma.agentJob.updateMany({ where: { status: "RUNNING", claimedAt: { lt: stale } }, data: { status: "QUEUED" } });
  await prisma.agentJob.updateMany({ where: { status: "SENDING", claimedAt: { lt: stale } }, data: { status: "APPROVED" } });
  const due = await prisma.agentJob.findMany({ where: { repeatDay: { not: null }, nextRunAt: { lte: now }, status: { in: ["DONE", "FAILED"] } } });
  for (const j of due) await prisma.agentJob.update({ where: { id: j.id }, data: { status: "QUEUED", summary: null, nextRunAt: nextWeekly(j.repeatDay!, now) } });

  const j = await prisma.agentJob.findFirst({ where: { status: { in: ["QUEUED", "APPROVED"] } }, orderBy: { updatedAt: "asc" } });
  if (!j) return null;
  const to = onClaim(j.status as JobStatus)!;
  // تحديث مشروط: إذا لابتوبين سألوا بنفس اللحظة، واحد بس بياخدها
  const r = await prisma.agentJob.updateMany({ where: { id: j.id, status: j.status }, data: { status: to, claimedAt: now } });
  if (!r.count) return null;
  return { id: j.id, phase: to === "SENDING" ? ("SEND" as const) : ("PREPARE" as const), kind: j.kind as JobKind, title: j.title, instructions: j.instructions, folder: j.folder };
}

export async function report(id: string, r: AgentReport, summary?: string | null): Promise<Result<{ status: JobStatus }>> {
  const j = await prisma.agentJob.findUnique({ where: { id } });
  if (!j) return err("NOT_FOUND", "مش موجودة");
  const to = onReport(j.status as JobStatus, r, j.standing);
  if (!to) return err("STATE", `ما بينفع ${r} من ${j.status}`);
  await prisma.agentJob.update({ where: { id }, data: { status: to, summary: safeSummary(summary) ?? j.summary, ...(to === "DONE" || to === "FAILED" ? { finishedAt: new Date() } : {}) } });
  return ok({ status: to });
}
