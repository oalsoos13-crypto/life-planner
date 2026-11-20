/** حلقة العلامة 0..1 (Doerr: 0.7 = نجاح للطموح). اللون مع الرقم، مش لحاله */
export function Ring({ value, size = 56 }: { value: number | null; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  const color = value == null ? "var(--color-line)" : v >= 0.7 ? "var(--color-success)" : v >= 0.4 ? "var(--color-gold-deco)" : "var(--color-accent)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 320ms var(--ease-in)" }}
        />
      </svg>
      <span className="tnum absolute inset-0 flex items-center justify-center text-[15px] font-extrabold" dir="ltr">
        {value == null ? "–" : v.toFixed(1)}
      </span>
    </div>
  );
}
