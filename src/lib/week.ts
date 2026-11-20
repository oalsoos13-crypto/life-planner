import { prisma, getSettings } from "./db";
import { addDays, todayYmd, toDate, toYmd, weekStartOf, type Ymd } from "./dates";
import * as Exec from "@/modules/execution";
import type { Prisma } from "@prisma/client";

export async function getContext() {
  const settings = await getSettings();
  const today = todayYmd(settings.timezone);
  const currentWeek = weekStartOf(today, settings.weekStartDay);
  return { settings, today, currentWeek };
}

export const isEditableWeek = Exec.isEditableWeek;

export async function assertEditableWeek(ws: Date | Ymd) {
  const { currentWeek } = await getContext();
  const w = typeof ws === "string" ? ws : toYmd(ws);
  if (!isEditableWeek(w, currentWeek)) throw new Error("هالأسبوع للقراءة بس");
}

// نسخ المهام المتكررة للأسبوع الحالي والجاي (لحالها)
export async function ensureRecurrences(currentWeek: Ymd) {
  for (const ws of [currentWeek, addDays(currentWeek, 7)]) {
    const wsDate = toDate(ws);
    const recs = await prisma.recurrence.findMany({
      where: {
        startWeek: { lte: wsDate },
        OR: [{ stoppedAt: null }, { stoppedAt: { gt: wsDate } }],
        tasks: { none: { weekStart: wsDate } },
      },
    });
    for (const r of recs) {
      const steps = Array.isArray(r.steps) ? (r.steps as string[]) : [];
      try {
        await prisma.weeklyTask.create({
          data: {
            weekStart: wsDate,
            title: r.title,
            goalId: r.goalId,
            notes: r.notes,
            recurrenceId: r.id,
            isAuto: true,
            order: 1000,
            steps: { create: steps.map((title, i) => ({ title, order: i })) },
          },
        });
      } catch {
        // انعملت من طلب ثاني بنفس اللحظة
      }
    }
  }
}

export const taskInclude = {
  goal: { include: { pillar: true } },
  steps: { orderBy: { order: "asc" } },
  recurrence: { select: { stoppedAt: true } },
} satisfies Prisma.WeeklyTaskInclude;

export type TaskWithRels = Prisma.WeeklyTaskGetPayload<{ include: typeof taskInclude }>;

// محوّلات رفيعة: القاعدة بتخزّن Date، المجال بيشتغل بـ Ymd
export function isOverdue(t: { status: string; cancelledAt: Date | null; weekStart: Date }, today: Ymd) {
  return Exec.isOverdue({ ...t, weekStart: toYmd(t.weekStart) }, today);
}

export async function getWeekTasks(ws: Ymd) {
  return prisma.weeklyTask.findMany({
    where: { weekStart: toDate(ws) },
    include: taskInclude,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export function weekStats(tasks: { status: string; cancelledAt: Date | null; stuck: boolean; weekStart: Date }[], today: Ymd) {
  return Exec.weekStats(tasks.map((t) => ({ ...t, weekStart: toYmd(t.weekStart) })), today);
}

export function toView(t: TaskWithRels, today: Ymd) {
  return {
    id: t.id,
    title: t.title,
    goalId: t.goalId,
    goalTitle: t.goal?.title ?? null,
    pillarName: t.goal?.pillar.name ?? null,
    color: t.goal?.pillar.color ?? null,
    notes: t.notes,
    progress: t.progress,
    imageData: t.imageData,
    status: t.status,
    cancelled: !!t.cancelledAt,
    cancelReason: t.cancelReason,
    stuck: t.stuck,
    stuckNote: t.stuckNote,
    carryCount: t.carryCount,
    isCarried: !!t.carriedFromId,
    repeating: !!t.recurrenceId && (!t.recurrence?.stoppedAt || t.recurrence.stoppedAt > t.weekStart),
    overdue: isOverdue(t, today),
    steps: t.steps.map((s) => ({ id: s.id, title: s.title, done: s.done })),
  };
}
