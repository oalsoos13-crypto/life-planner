import Link from "next/link";
import type { KpiStripItem } from "@/modules/daily/server";
import { Planet } from "@/components/space/Planet";

const fmt = (n: number | null) => (n == null ? "؟" : Number.isInteger(n) ? String(n) : n.toFixed(1));

// ألوان الكواكب: فاتح ← لون المحور ← ظل
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, t: number, k: number) => Math.round(c + (t - c) * k);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${mix(r, 255, 0.65)} ${mix(g, 255, 0.65)} ${mix(b, 255, 0.65)})`;
};

/** مدار: الكوكب بالنص (المحور)، والقمر ماشي على المدار بقدّ التقدّم نحو الهدف */
function Orbit({ id, p, color }: { id: string; p: number; color: string }) {
  const S = 96, cx = S / 2, cy = S / 2, rx = S / 2 - 6, ry = S * 0.2;
  const at = (k: number) => {
    const t = Math.PI * 2 * k;
    return [cx - rx * Math.sin(t), cy - ry * Math.cos(t)] as const; // من فوق، عكس عقارب الساعة (يمين لشمال)
  };
  const v = Math.max(0, Math.min(1, p));
  let d = "";
  for (let i = 0; i <= 60; i++) {
    const [x, y] = at((v * i) / 60);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const [mx, my] = at(v);
  return (
    <svg viewBox={`0 ${S * 0.19} ${S} ${S * 0.62}`} className="mx-auto w-full max-w-[110px]" style={{ overflow: "visible" }} aria-hidden>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="var(--color-line)" />
      {v > 0 && <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
      <g transform={`translate(${cx - 17} ${cy - 17})`}>
        <Planet id={id} r={15} light={shade(color)} base={color} band="#fff" />
      </g>
      <circle cx={mx} cy={my} r="9" fill={color} opacity=".35" />
      <circle cx={mx} cy={my} r="4.5" fill="var(--star)" />
    </svg>
  );
}

/** «كواكب الربع»: كل أولوية كوكب، وقمرها بيدور حوله بقدّ ما تقدّمت. كبسة بتوديك عالاستراتيجية */
export function KpiStrip({ items }: { items: KpiStripItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="kpi-h">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="kpi-h" className="font-display text-[23px] font-bold">كواكب الربع</h2>
        <Link href="/strategy" className="btn btn-text btn-sm -me-2">الاستراتيجية</Link>
      </div>
      <Link href="/strategy" className="grid grid-cols-3 gap-2.5">
        {items.map((k) => (
          <div key={k.goalId} className="card min-w-0 px-2.5 py-3 text-center" aria-label={`${k.pillar}: ${k.name} ${fmt(k.latest)} من ${fmt(k.target)}`}>
            <Orbit id={`kpi-${k.goalId}`} p={k.progress ?? 0} color={k.color} />
            <div className="mt-1 truncate text-[11.5px] text-muted">{k.pillar} · {k.name}</div>
            <div className="font-display text-[24px] font-bold leading-tight">
              <bdi className="tnum">{fmt(k.latest)}</bdi>
              <span className="font-sans text-[12px] font-normal text-muted"> / <bdi className="tnum">{fmt(k.target)}</bdi></span>
            </div>
          </div>
        ))}
      </Link>
    </section>
  );
}
