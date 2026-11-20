/**
 * رسومات الفضاء (هوية «فضاء ونجوم»): SVG خالص بدون مكتبات، بيشتغل بالسيرفر والمتصفح.
 * كل رسمة إلها id ثابت عشان تدرّجاتها ما تتعارك مع بعض بنفس الصفحة.
 */
type PlanetProps = { id: string; r: number; light?: string; base?: string; band?: string; ring?: boolean; className?: string; glow?: boolean };

export function Planet({ id, r, light = "#d9ccff", base = "#6a4fe0", band = "#c4b5ff", ring = false, className, glow = true }: PlanetProps) {
  const W = ring ? r * 3.2 : r * 2 + 4;
  const H = r * 2 + 4;
  const cx = W / 2;
  const cy = H / 2;
  const rot = `rotate(-18 ${cx} ${cy})`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={className} style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={light} />
          <stop offset=".5" stopColor={base} />
          <stop offset="1" stopColor="#07051c" />
        </radialGradient>
        <linearGradient id={`${id}-r`}>
          <stop offset="0" stopColor="#b9f3ff" stopOpacity=".2" />
          <stop offset=".5" stopColor="#e9e4ff" />
          <stop offset="1" stopColor="#8b7bff" stopOpacity=".3" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <filter id={`${id}-f`}>
          <feGaussianBlur stdDeviation={r * 0.25} />
        </filter>
      </defs>
      {glow && <circle cx={cx} cy={cy} r={r} fill={base} opacity=".45" filter={`url(#${id}-f)`} />}
      {ring && <ellipse cx={cx} cy={cy} rx={r * 1.55} ry={r * 0.38} fill="none" stroke={`url(#${id}-r)`} strokeWidth={r * 0.12} opacity=".55" transform={rot} />}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-g)`} />
      <g clipPath={`url(#${id}-c)`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx={cx} cy={cy - r + r * 0.35 + i * r * 0.33} rx={r * 1.1} ry={r * 0.07} fill={band} opacity={0.12 + (i % 2) * 0.1} />
        ))}
        <circle cx={cx + r * 0.5} cy={cy + r * 0.5} r={r * 1.1} fill="#05061a" opacity=".35" />
      </g>
      {ring && <path d={`M ${cx - r * 1.55} ${cy} A ${r * 1.55} ${r * 0.38} 0 0 0 ${cx + r * 1.55} ${cy}`} fill="none" stroke={`url(#${id}-r)`} strokeWidth={r * 0.12} transform={rot} />}
    </svg>
  );
}

/** هلال: بيتعبّى بحسب يوم الشهر الهجري (1 هلال رفيع، 14 بدر) */
export function Moon({ id, r = 13, day = 10 }: { id: string; r?: number; day?: number }) {
  const phase = Math.min(1, Math.abs(15 - day) / 15); // 0 بدر، 1 محاق
  const shift = r * (0.2 + 1.6 * (1 - phase));
  return (
    <svg width={r * 2 + 8} height={r * 2 + 8} style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="40%" cy="35%">
          <stop offset="0" stopColor="#fffbe9" />
          <stop offset="1" stopColor="#c9c3ff" />
        </radialGradient>
        <mask id={`${id}-m`}>
          <rect width="100%" height="100%" fill="white" />
          {day !== 15 && day !== 14 && <circle cx={r + 4 - shift} cy={r + 4 - r * 0.1} r={r * 0.95} fill="black" />}
        </mask>
        <filter id={`${id}-f`}>
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <circle cx={r + 4} cy={r + 4} r={r} fill="#d9d4ff" opacity=".55" filter={`url(#${id}-f)`} mask={`url(#${id}-m)`} />
      <circle cx={r + 4} cy={r + 4} r={r} fill={`url(#${id}-g)`} mask={`url(#${id}-m)`} />
    </svg>
  );
}

/** نجمة بأربع رؤوس */
export const sparklePath = (x: number, y: number, s: number) =>
  `M ${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`;

/** مجرّة حلزونية من نقاط، مولّدة بشكل ثابت (نفس الشكل كل مرة) */
export function Galaxy({ id, w = 150, h = 110, className }: { id: string; w?: number; h?: number; className?: string }) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cx = w / 2;
  const cy = h / 2;
  const dots: { x: number; y: number; r: number; c: string; o: number }[] = [];
  for (let a = 0; a < 2; a++)
    for (let i = 0; i < 180; i++) {
      const t = (i / 180) * 4.2;
      const rad = 6 + t * w * 0.1;
      const ang = t * 1.6 + a * Math.PI + (rnd() - 0.5) * 0.5;
      dots.push({ x: cx + Math.cos(ang) * rad * (1 + (rnd() - 0.5) * 0.25), y: cy + Math.sin(ang) * rad * 0.42 * (1 + (rnd() - 0.5) * 0.25), r: rnd() * 1.1 + 0.3, c: rnd() < 0.5 ? "#c4b5ff" : "#9fdcff", o: 0.3 + rnd() * 0.6 });
    }
  return (
    <svg width={w} height={h} className={className} style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-c`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset=".2" stopColor="#c4b5ff" stopOpacity=".6" />
          <stop offset="1" stopColor="#8b7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`rotate(-20 ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={w * 0.45} ry={h * 0.3} fill={`url(#${id}-c)`} opacity=".35" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(2)} fill={d.c} opacity={d.o.toFixed(2)} />
        ))}
        <circle cx={cx} cy={cy} r="9" fill={`url(#${id}-c)`} />
      </g>
    </svg>
  );
}
