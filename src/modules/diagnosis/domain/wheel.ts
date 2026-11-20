// لوحة الحياة 0-10 (منهجية §2: التحليل الداخلي). منطق نقي.

export type WheelEntry = { pillarId: string; name: string; score: number | null };

export const clampScore = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

/** المعدّل، وأضعف محور أو اتنين (هون غالباً «التحدي الأساسي»)، والفرق بين الأعلى والأدنى */
export function wheelStats(entries: WheelEntry[]) {
  const s = entries.filter((e) => e.score != null) as (WheelEntry & { score: number })[];
  if (!s.length) return { avg: null, lowest: [] as string[], spread: null, rated: 0 };
  const avg = Math.round((s.reduce((a, e) => a + e.score, 0) / s.length) * 10) / 10;
  const min = Math.min(...s.map((e) => e.score));
  const max = Math.max(...s.map((e) => e.score));
  return { avg, lowest: s.filter((e) => e.score === min).map((e) => e.name).slice(0, 2), spread: max - min, rated: s.length };
}

export const SWOT_KINDS = ["S", "W", "O", "T"] as const;
export type SwotKind = (typeof SWOT_KINDS)[number];
export const SWOT_LABEL: Record<SwotKind, string> = { S: "قوة", W: "ضعف", O: "فرصة", T: "تهديد" };
