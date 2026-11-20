// قواعد المهمة الأسبوعية (DDD: تجميع المهمة؛ GoF: State كدوال)
// نقي: ما بيعرف Prisma ولا Next ولا «شو الساعة»؛ الوقت بينمرق له.
import { addDays, weekEnd, type Ymd } from "@/shared/kernel/dates";

export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

/** حد الشغل المفتوح: مهام «ماشية» مربوطة بأهداف (المنهجية 4.6، كانبان) */
export const WIP_LIMIT = 3;

/** بقدر أعدّل الأسبوع الماضي والحالي والجاي بس */
export function isEditableWeek(ws: Ymd, currentWeek: Ymd) {
  return ws === currentWeek || ws === addDays(currentWeek, -7) || ws === addDays(currentWeek, 7);
}

/** شو بيتغيّر لما الحالة تتغير */
export function statusPatch(status: TaskStatus, now: Date) {
  return {
    status,
    completedAt: status === "DONE" ? now : null,
    // لما تخلص، علامة «عالقة» بتنشال لحالها والنسبة بتصير 100
    ...(status === "DONE" ? { stuck: false, stuckNote: null, progress: 100 } : {}),
  };
}

/** أول خطوة بتخلص بتخلّي المهمة «ماشية» إذا كانت لسا ما بلّشت */
export function statusAfterStep(current: TaskStatus, stepDone: boolean): TaskStatus {
  return stepDone && current === "NOT_STARTED" ? "IN_PROGRESS" : current;
}

export type TaskLike = { status: string; cancelledAt: Date | null; stuck: boolean; weekStart: Ymd };

export function isOverdue(t: { status: string; cancelledAt: Date | null; weekStart: Ymd }, today: Ymd) {
  return t.status !== "DONE" && !t.cancelledAt && weekEnd(t.weekStart) < today;
}

export function weekStats(tasks: TaskLike[], today: Ymd) {
  const active = tasks.filter((t) => !t.cancelledAt);
  const done = active.filter((t) => t.status === "DONE").length;
  return {
    total: active.length,
    done,
    inProgress: active.filter((t) => t.status === "IN_PROGRESS").length,
    stuck: active.filter((t) => t.stuck && t.status !== "DONE").length,
    overdue: active.filter((t) => isOverdue(t, today)).length,
    cancelled: tasks.length - active.length,
    pct: active.length ? Math.round((done / active.length) * 100) : null,
  };
}

/** تنبيه ناعم: أكثر من 3 «ماشية» مربوطة بأهداف */
export function wipWarning(tasks: { status: string; goalId: string | null; cancelledAt: Date | null }[]) {
  const n = tasks.filter((t) => !t.cancelledAt && t.status === "IN_PROGRESS" && t.goalId).length;
  return n > WIP_LIMIT ? { count: n, limit: WIP_LIMIT } : null;
}

export function clampProgress(p: number) {
  return Math.max(0, Math.min(100, Math.round(p)));
}
