import { fmtMinute, nowInDay, type DayBlock } from "@/modules/daily";

const FROM = 6 * 60;
const TO = 24 * 60;

/**
 * خط اليوم من 6 الصبح لنص الليل، يمين لشمال (RTL): الدوامات، وين إنت هلّق، وأقرب وقت فاضي.
 * هاد أساس «منحنى الطاقة»: لما تتجمّع قراءات طاقتك والنوم، المنحنى بينرسم فوقه.
 */
export function DayLine({ blocks, minute }: { blocks: DayBlock[]; minute: number }) {
  const W = 1000;
  const x = (m: number) => W - ((Math.min(TO, Math.max(FROM, m)) - FROM) / (TO - FROM)) * W;
  const { current, nextFree } = nowInDay(blocks, minute);
  const ticks = [6, 9, 12, 15, 18, 21, 24];
  const color = (k: DayBlock["kind"]) => (k === "WORK" ? "var(--color-info)" : k === "WORK2" ? "var(--color-gold-deco)" : "var(--color-field)");
  const inRange = minute >= FROM && minute <= TO;
  return (
    <section className="card p-4" aria-labelledby="day-h">
      <div className="flex items-baseline justify-between">
        <h2 id="day-h" className="font-display text-[23px] font-bold">يومك</h2>
        <span className="text-[13px] text-muted">{current ? `هلّق: ${current.label} لـ ${fmtMinute(current.end)}` : "هلّق: وقتك إلك"}</span>
      </div>
      <svg viewBox={`0 0 ${W} 86`} className="mt-3 w-full" role="img" aria-label={blocks.map((b) => `${b.label} من ${fmtMinute(b.start)} لـ ${fmtMinute(b.end)}`).join("، ")}>
        <rect x="0" y="34" width={W} height="14" rx="7" fill="var(--color-surface-2)" />
        {blocks.map((b) => (
          <rect key={b.label + b.start} x={x(b.end)} y="34" width={Math.max(0, x(b.start) - x(b.end))} height="14" rx="7" fill={color(b.kind)} />
        ))}
        {nextFree && <rect x={x(nextFree.end)} y="30" width={Math.max(0, x(nextFree.start) - x(nextFree.end))} height="22" rx="11" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeDasharray="6 6" />}
        {ticks.map((h) => (
          <text key={h} x={x(h * 60)} y="78" textAnchor={h === 6 ? "end" : h === 24 ? "start" : "middle"} fontSize="22" fill="var(--color-muted)">{fmtMinute(h * 60)}</text>
        ))}
        {inRange && (
          <g>
            <line x1={x(minute)} x2={x(minute)} y1="10" y2="56" stroke="var(--color-ink)" strokeWidth="3" />
            <circle cx={x(minute)} cy="10" r="8" fill="var(--color-ink)" />
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
        {blocks.map((b) => (
          <span key={b.label} className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 rounded-full" style={{ background: color(b.kind) }} />{b.label}</span>
        ))}
        {nextFree && <span className="font-bold text-success">فاضي {fmtMinute(nextFree.start)}–{fmtMinute(nextFree.end)}</span>}
      </div>
    </section>
  );
}
