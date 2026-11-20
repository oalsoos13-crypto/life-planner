// كائن قيمة: بداية + هدف + اتجاه → تقدم 0..1 (GoF: Strategy حسب الاتجاه)
// مشترك لأنه الاستراتيجية (علامة OKR) والقياس (بطاقة الأداء) الاثنين بيحتاجوه.
export type Direction = "UP" | "DOWN";
export type MetricTarget = { start: number | null; target: number | null; direction: Direction };

const strategies: Record<Direction, (s: number, t: number, v: number) => number> = {
  UP: (s, t, v) => (v - s) / (t - s),
  DOWN: (s, t, v) => (s - v) / (s - t),
};

/** تقدم 0..1؛ null إذا ناقص بداية أو هدف أو قراءة */
export function progress(m: MetricTarget, value: number | null | undefined): number | null {
  if (m.start == null || m.target == null || value == null) return null;
  if (m.start === m.target) return value === m.target ? 1 : 0;
  const p = strategies[m.direction](m.start, m.target, value);
  if (!Number.isFinite(p)) return null;
  return Math.round(Math.min(1, Math.max(0, p)) * 100) / 100;
}

/** هل المؤشر «رقم» حقيقي؟ (نتيجة رئيسية لازم يكون إلها هدف رقمي، مش مهمة) */
export const isMeasurable = (m: { target: number | null }) => m.target != null;
