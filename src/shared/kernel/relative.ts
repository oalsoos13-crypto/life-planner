// مواعيد نسبية بدل تاريخ مطلق (About Face: البرنامج المؤدب)
import { toDate, type Ymd } from "./dates";

export function daysBetween(from: Ymd, to: Ymd) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 864e5);
}

export function relativeDay(due: Ymd, today: Ymd): string {
  const d = daysBetween(today, due);
  if (d === 0) return "اليوم";
  if (d === 1) return "بكرا";
  if (d === -1) return "مبارح";
  if (d === 2) return "بعد يومين";
  if (d > 2 && d <= 10) return `بعد ${d} أيام`;
  if (d > 10) return `بعد ${d} يوم`;
  return `من ${-d} أيام`;
}
