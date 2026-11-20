import { fmtMinute, nowInDay, type DayBlock } from "@/modules/daily";

const FROM = 6 * 60;
const TO = 24 * 60;

/**
 * «مسار يومك»: الشمس بتمشي على قوس السما من 6 الصبح (يمين) لنص الليل (شمال).
 * على القوس الدوامات، والشمس وين إنت هلّق، والقمر آخر الليل، وأقرب وقت فاضي بالأخضر.
 * هاد أساس «منحنى الطاقة»: لما تتجمّع قراءات طاقتك والنوم، المنحنى بينرسم تحت القوس.
 */
export function DayLine({ blocks, minute }: { blocks: DayBlock[]; minute: number }) {
  const W = 350;
  const H = 150;
  const cx = W / 2;
  const cy = H - 28;
  const R = W / 2 - 18;
  const pt = (m: number) => {
    const t = (Math.min(TO, Math.max(FROM, m)) - FROM) / (TO - FROM);
    const a = Math.PI * t;
    return [cx + R * Math.cos(a), cy - R * Math.sin(a) * 0.78] as const;
  };
  const arc = (a: number, b: number) => {
    let d = "";
    for (let i = 0; i <= 36; i++) {
      const [x, y] = pt(a + ((b - a) * i) / 36);
      d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };
  const { current, nextFree } = nowInDay(blocks, minute);
  const color = (k: DayBlock["kind"]) => (k === "WORK" ? "#5ec8ff" : k === "WORK2" ? "#c46bff" : "var(--color-field)");
  const inRange = minute >= FROM && minute <= TO;
  const [sx, sy] = pt(minute);
  const [mx, my] = pt(1430);
  return (
    <section className="card p-4" aria-labelledby="day-h">
      <div className="flex items-baseline justify-between">
        <h2 id="day-h" className="font-display text-[23px] font-bold">مسار يومك</h2>
        <span className="text-[13px] text-muted">{current ? `هلّق: ${current.label} لـ ${fmtMinute(current.end)}` : "هلّق: وقتك إلك"}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" style={{ overflow: "visible" }} aria-label={blocks.map((b) => `${b.label} من ${fmtMinute(b.start)} لـ ${fmtMinute(b.end)}`).join("، ")}>
        <defs>
          <radialGradient id="dl-sun">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".35" stopColor="#ffe3a3" />
            <stop offset="1" stopColor="#ff9e5e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line x1="18" x2={W - 18} y1={cy} y2={cy} stroke="var(--color-line)" />
        <path d={arc(FROM, TO)} fill="none" stroke="var(--color-line)" strokeWidth="2" />
        {blocks.map((b) => (
          <path key={b.label + b.start} d={arc(b.start, b.end)} fill="none" stroke={color(b.kind)} strokeWidth="6" strokeLinecap="round" />
        ))}
        {nextFree && <path d={arc(nextFree.start, nextFree.end)} fill="none" stroke="var(--color-success)" strokeWidth="3" strokeDasharray="4 6" strokeLinecap="round" />}
        <mask id="dl-mm">
          <rect x={mx - 20} y={my - 50} width="40" height="40" fill="white" />
          <circle cx={mx + 4} cy={my - 33} r="8.5" fill="black" />
        </mask>
        <circle cx={mx} cy={my - 30} r="9" fill="#e6e1ff" mask="url(#dl-mm)" />
        <text x={pt(FROM)[0]} y={cy + 20} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{fmtMinute(FROM)}</text>
        <text x={pt(720)[0]} y={pt(720)[1] - 12} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{fmtMinute(720)}</text>
        {inRange && (
          <g>
            <circle cx={sx} cy={sy} r="26" fill="url(#dl-sun)" />
            <circle cx={sx} cy={sy} r="8" fill="#fff6dc" />
            <text x={sx} y={sy + 38} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-warning)">هلّق {fmtMinute(minute)}</text>
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
