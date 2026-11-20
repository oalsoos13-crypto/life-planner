import type { KnowPart } from "@/modules/profile";
import { Planet } from "@/components/space/Planet";

// كل بعد من «قديش بيعرفني» مدار، والقوس المضوّي قدّ ما بيعرف فيه. بالنص كوكبك والنسبة.
const COLORS = ["#c9b8ff", "#9fdcff", "#ffd38a", "#8ff0c4", "#ff9fc8", "#b0f0ff", "#ffb68a"];

export function KnowOrbit({ score, parts }: { score: number; parts: KnowPart[] }) {
  const S = 300, c = S / 2;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {parts.map((p, i) => {
          const r = 62 + i * 13;
          const len = 2 * Math.PI * r;
          const frac = p.max ? p.got / p.max : 0;
          return (
            <g key={p.key} transform={`rotate(-90 ${c} ${c})`}>
              <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-line)" strokeWidth="1" />
              {frac > 0 && (
                <circle cx={c} cy={c} r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${len * frac} ${len}`} style={{ filter: `drop-shadow(0 0 4px ${COLORS[i % COLORS.length]})` }} />
              )}
              {frac > 0 && (
                <circle cx={c + r * Math.cos(2 * Math.PI * frac)} cy={c + r * Math.sin(2 * Math.PI * frac)} r="3.5" fill="var(--star)" />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-[104px] w-[104px] items-center justify-center">
          <div className="absolute inset-0 opacity-90"><Planet id="me-core" r={52} light="#ffffff" base="#7b66ff" band="#fff" /></div>
          <div className="relative text-center text-white" style={{ textShadow: "0 1px 8px rgb(20 10 60 / .7)" }}>
            <div className="font-display text-[34px] font-bold leading-none tnum">{score}<span className="text-[18px]">%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KnowLegend({ parts }: { parts: KnowPart[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
      {parts.map((p, i) => (
        <li key={p.key} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
          <span className="min-w-0 flex-1 truncate">{p.label}</span>
          <bdi className="tnum text-muted">{p.got}/{p.max}</bdi>
        </li>
      ))}
    </ul>
  );
}
