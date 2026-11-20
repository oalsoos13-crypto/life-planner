import Link from "next/link";
import type { KpiStripItem } from "@/modules/daily/server";

const fmt = (n: number | null) => (n == null ? "؟" : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** خط اتجاه صغير (Refactoring UI: الرقم أول، والسياق بعده). الأقدم يمين والأحدث شمال (RTL) */
function Spark({ series }: { series: number[] }) {
  const W = 100, H = 28;
  const max = Math.max(...series), min = Math.min(...series);
  // لسا ما في حركة: خط منقّط هادي بدل خط مسطّح بيوحي إنه «صفر وواقف»
  if (series.length < 2 || max === min)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--color-line)" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  const pts = series.map((v, i) => [W - (i / (series.length - 1)) * W, H - 4 - ((v - min) / (max - min || 1)) * (H - 8)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${last[0]} ${H} L${W} ${H} Z`} fill="color-mix(in srgb, var(--color-accent) 10%, transparent)" />
      <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** أهم رقم لكل أولوية (المخطط: كل التقاط بيحرّك مؤشر). كبسة بتوديك عالاستراتيجية */
export function KpiStrip({ items }: { items: KpiStripItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="kpi-h">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="kpi-h" className="font-display text-[23px] font-bold">أرقام الربع</h2>
        <Link href="/strategy" className="btn btn-text btn-sm -me-2">الاستراتيجية</Link>
      </div>
      <Link href="/strategy" className="card grid grid-cols-3 divide-x divide-x-reverse divide-line overflow-hidden">
        {items.map((k) => (
          <div key={k.goalId} className="min-w-0 p-3">
            <div className="truncate text-[12px] text-muted">{k.pillar}</div>
            <div className="truncate text-[12px] text-muted">{k.name}</div>
            <div className="mt-0.5 font-display text-[28px] font-bold leading-tight text-accent dark:text-gold">
              <bdi className="tnum">{fmt(k.latest)}</bdi>
              <span className="font-sans text-[12.5px] font-normal text-muted"> / <bdi className="tnum">{fmt(k.target)}</bdi></span>
            </div>
            <Spark series={k.series} />
          </div>
        ))}
      </Link>
    </section>
  );
}
