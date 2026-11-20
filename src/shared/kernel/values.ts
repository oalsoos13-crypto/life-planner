// كائنات القيمة (DDD) كدوال تحقق بسيطة
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** علامة 0..1 بمنزلتين (علامة OKR) */
export const score01 = (n: number) => Math.round(clamp(n, 0, 1) * 100) / 100;

/** تقييم صحيح 0..10 (لوحة الحياة، الأوديسة، الفرص) */
export function rating10(n: number): number {
  if (!Number.isFinite(n)) throw new RangeError("rating10: مش رقم");
  return clamp(Math.round(n), 0, 10);
}

/** ساعات مع هامش الجوهرية 50% (Essentialism) */
export const withBuffer = (hours: number, buffer = 0.5) => Math.max(0, hours) * (1 + buffer);
