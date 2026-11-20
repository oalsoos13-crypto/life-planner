// منطق «اليوم» النقي (المخطط: محرك التنفيذ اليومي). ما بيعرف قاعدة البيانات ولا الواجهة.
import { addDays, toDate, type Ymd } from "@/shared/kernel/dates";

export type BlockKind = "WORK" | "WORK2" | "FREE" | "SLEEP";
/** فترة ثابتة باليوم بالدقائق من منتصف الليل (مثلاً بيبسي 480..960) */
export type DayBlock = { label: string; start: number; end: number; kind: BlockKind };

/** دوام عمر الافتراضي (من ملفه): بيبسي 8-4، الكافيه 5-10 */
export const DEFAULT_BLOCKS: DayBlock[] = [
  { label: "بيبسي", start: 8 * 60, end: 16 * 60, kind: "WORK" },
  { label: "الكافيه", start: 17 * 60, end: 22 * 60, kind: "WORK2" },
];

const isBlock = (b: unknown): b is DayBlock =>
  !!b && typeof b === "object" && typeof (b as DayBlock).label === "string" && Number.isFinite((b as DayBlock).start) && Number.isFinite((b as DayBlock).end) && (b as DayBlock).end > (b as DayBlock).start;

/** بيقرأ الإعداد المخزّن بأمان، وإذا خربان بيرجع للافتراضي */
export function parseBlocks(raw: unknown): DayBlock[] {
  if (!Array.isArray(raw)) return DEFAULT_BLOCKS;
  const ok = raw.filter(isBlock).map((b) => ({ ...b, start: Math.max(0, b.start), end: Math.min(24 * 60, b.end) }));
  return ok.length ? ok.sort((a, b) => a.start - b.start) : DEFAULT_BLOCKS;
}

/** بالجمعة والسبت ما في دوام بيبسي (WORK)، الكافيه كل يوم */
export function blocksForDay(blocks: DayBlock[], weekday: number): DayBlock[] {
  const weekend = weekday === 5 || weekday === 6;
  return weekend ? blocks.filter((b) => b.kind !== "WORK") : blocks;
}

/** وين إنت هلق، وشو أقرب فترة فاضية جاية (لاقتراح «الخطوة الجاية» بوقتها) */
export function nowInDay(blocks: DayBlock[], minute: number): { current: DayBlock | null; nextFree: { start: number; end: number } | null } {
  const current = blocks.find((b) => minute >= b.start && minute < b.end) ?? null;
  let t = current ? current.end : minute;
  const DAY_END = 24 * 60;
  for (const b of blocks) {
    if (b.end <= t) continue;
    if (b.start > t) return { current, nextFree: { start: t, end: b.start } };
    t = Math.max(t, b.end);
  }
  return { current, nextFree: t < DAY_END ? { start: t, end: DAY_END } : null };
}

export const fmtMinute = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""}${h < 12 ? "ص" : "م"}`;
};

/** التحية حسب الساعة */
export const greeting = (hour: number) => (hour >= 4 && hour < 12 ? "صباح الخير" : "مسا الخير");

/** التاريخ الهجري (أم القرى) */
export function hijriLabel(ymd: Ymd): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(toDate(ymd))
    .replace(/\s*هـ$/, "");
}

/** رقم اليوم بالشهر الهجري (لرسم الهلال) */
export function hijriDay(ymd: Ymd): number {
  return Number(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", timeZone: "UTC" }).format(toDate(ymd)));
}

/** أول يوم برمضان الجاي (أو اليوم إذا إحنا فيه)، بالتقويم الأم القرى */
export function nextRamadan(today: Ymd): Ymd | null {
  const f = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric", day: "numeric", timeZone: "UTC" });
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, i);
    const parts = f.formatToParts(toDate(d));
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    if (month === 9) return i === 0 ? addDays(d, 1 - day) : d;
  }
  return null;
}

/** سلسلة العادة: كم يوم ورا بعض لحد اليوم (إذا اليوم لسا ما انعملت، منبدأ من مبارح) */
export function streak(checked: Set<Ymd>, today: Ymd): number {
  let d = checked.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (checked.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** «ما تفوّت مرتين» (Atomic Habits): إذا فوّتها مبارح ولسا ما عملها اليوم */
export const missedTwiceRisk = (checked: Set<Ymd>, today: Ymd) => !checked.has(today) && !checked.has(addDays(today, -1)) && checked.size > 0;

export const INTENT_MAX = 140;
export function cleanIntent(s: string | null | undefined): string | null {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, INTENT_MAX) : null;
}

export const clampScale = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : Math.min(5, Math.max(1, Math.round(n))));
