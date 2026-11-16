// كل التواريخ "أيام" بصيغة YYYY-MM-DD، ومخزّنة كـ Date عند منتصف الليل UTC
export type Ymd = string;

export function toDate(ymd: Ymd): Date {
  return new Date(ymd + "T00:00:00.000Z");
}

export function toYmd(d: Date): Ymd {
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: Ymd, n: number): Ymd {
  const d = toDate(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return toYmd(d);
}

export function todayYmd(timezone = "Asia/Kuwait"): Ymd {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dayOfWeek(ymd: Ymd): number {
  return toDate(ymd).getUTCDay(); // 0 = الأحد
}

export function weekStartOf(ymd: Ymd, startDay = 0): Ymd {
  const diff = (dayOfWeek(ymd) - startDay + 7) % 7;
  return addDays(ymd, -diff);
}

export function weekEnd(weekStart: Ymd): Ymd {
  return addDays(weekStart, 6);
}

export function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toDate(s).getTime());
}

export function formatDay(ymd: Ymd, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { ...opts, timeZone: "UTC" }).format(toDate(ymd));
}

export function formatWeekRange(weekStart: Ymd, locale: string): string {
  return `${formatDay(weekStart, locale)} – ${formatDay(weekEnd(weekStart), locale)}`;
}
