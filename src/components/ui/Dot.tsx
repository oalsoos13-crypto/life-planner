import { darkOf } from "./palette";

/** نقطة لون المحور؛ اللون مش الحامل الوحيد للمعنى، الاسم دايماً جنبها (RHY) */
export function Dot({ color, className = "" }: { color?: string | null; className?: string }) {
  return <span aria-hidden className={`dot ${className}`} style={{ ["--c" as string]: color ?? "var(--color-line)", ["--c-dark" as string]: darkOf(color) }} />;
}
