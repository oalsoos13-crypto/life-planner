// تغيير يوم بداية الأسبوع: حساب نقي للتحريك، والتنفيذ بمعاملة وحدة بحالة الاستخدام
import { weekStartOf, type Ymd } from "@/shared/kernel/dates";

export function remapWeekStart(ws: Ymd, newDay: number): Ymd {
  return weekStartOf(ws, newDay);
}

export function normalizeWeekDay(n: number) {
  if (!Number.isFinite(n)) throw new RangeError("يوم مش صحيح");
  return Math.max(0, Math.min(6, Math.trunc(n)));
}

/**
 * لما نحرّك المهام، مهمتين متكررتين من نفس القالب ممكن يوقعوا بنفس الأسبوع الجديد.
 * بترجّع المعرّفات الي لازم تنحذف (النسخ التلقائية المكررة) عشان القيد unique ما ينكسر.
 */
export function recurrenceCollisions(
  tasks: { id: string; recurrenceId: string | null; newWeek: Ymd; isAuto: boolean; touched: boolean }[]
): string[] {
  const seen = new Map<string, string>();
  const drop: string[] = [];
  // المهام الي لمستها أنا أولى من النسخ التلقائية
  const sorted = [...tasks].sort((a, b) => Number(a.isAuto && !a.touched) - Number(b.isAuto && !b.touched));
  for (const t of sorted) {
    if (!t.recurrenceId) continue;
    const key = `${t.recurrenceId}|${t.newWeek}`;
    if (seen.has(key)) drop.push(t.id);
    else seen.set(key, t.id);
  }
  return drop;
}
