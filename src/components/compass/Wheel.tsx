"use client";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { SWOT_LABEL, type SwotKind } from "@/modules/diagnosis";
import * as A from "@/app/compass/actions";

type Entry = { pillarId: string; name: string; color: string; score: number | null; prev: number | null };

/** لوحة الحياة كمجرّة: كل محور شعاع، وتقييمك 0-10 بيرسم شكل حياتك (منهجية §2) */
export function Wheel({ entries, avg, lowest, ratedOn }: { entries: Entry[]; avg: number | null; lowest: string[]; ratedOn: string | null }) {
  const [open, setOpen] = useState(false);
  const S = 300, c = S / 2, R = 112;
  const n = entries.length || 1;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 - (i * 2 * Math.PI) / n; // يمين لشمال
    return [c + Math.cos(a) * (R * v) / 10, c + Math.sin(a) * (R * v) / 10] as const;
  };
  const poly = (key: "score" | "prev") => entries.map((e, i) => pt(i, e[key] ?? 0).map((x) => x.toFixed(1)).join(",")).join(" ");
  const rated = entries.some((e) => e.score != null);
  const hasPrev = entries.some((e) => e.prev != null);
  return (
    <section className="card p-4" aria-labelledby="wheel-h">
      <div className="flex items-baseline justify-between">
        <h3 id="wheel-h" className="font-display text-[20px] font-bold">لوحة حياتك</h3>
        <button type="button" className="btn btn-text btn-sm -me-2" onClick={() => setOpen(true)}>{rated ? "قيّم من جديد" : "قيّم هلّق"}</button>
      </div>
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto mt-1 w-full max-w-[320px]" role="img" aria-label={entries.map((e) => `${e.name} ${e.score ?? "؟"} من 10`).join("، ")} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="wh-g"><stop offset="0" stopColor="var(--color-gold-deco)" stopOpacity=".55" /><stop offset="1" stopColor="var(--color-gold-deco)" stopOpacity=".12" /></radialGradient>
        </defs>
        {[2, 4, 6, 8, 10].map((r) => <circle key={r} cx={c} cy={c} r={(R * r) / 10} fill="none" stroke="var(--color-line)" strokeDasharray={r === 10 ? undefined : "2 4"} />)}
        {entries.map((e, i) => { const [x, y] = pt(i, 10); return <line key={e.pillarId} x1={c} y1={c} x2={x} y2={y} stroke="var(--color-line)" />; })}
        {hasPrev && <polygon points={poly("prev")} fill="none" stroke="var(--color-muted)" strokeDasharray="3 4" />}
        {rated && <polygon points={poly("score")} fill="url(#wh-g)" stroke="var(--color-gold)" strokeWidth="2" strokeLinejoin="round" />}
        {entries.map((e, i) => {
          const [x, y] = pt(i, e.score ?? 0);
          const [lx, ly] = pt(i, 12.6);
          return (
            <g key={e.pillarId}>
              {e.score != null && <><circle cx={x} cy={y} r="7" fill={e.color} opacity=".35" /><circle cx={x} cy={y} r="3.5" fill="var(--star)" /></>}
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--color-muted)">{e.name}</text>
              {e.score != null && <text x={lx} y={ly + 14} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-ink)">{e.score}</text>}
            </g>
          );
        })}
        <circle cx={c} cy={c} r="5" fill="var(--color-gold)" />
      </svg>
      {rated ? (
        <p className="mt-1 text-[14px] text-muted">
          المعدّل <b className="tnum text-ink">{avg}</b> من 10 · الأضعف: <b className="text-warning">{lowest.join(" و")}</b>. هون غالباً بيكون تحدّيك الأساسي (Rumelt).
          {ratedOn && <span className="block text-[12.5px]">آخر تقييم {ratedOn} · الخط المنقّط = التقييم الي قبله</span>}
        </p>
      ) : (
        <p className="mt-1 text-[14px] text-muted">قيّم كل محور من 0 لـ 10 بصراحة. دقيقة وحدة، وبتعيده كل شهر عشان تشوف الحركة.</p>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="قيّم حياتك هلّق">
        <RateForm entries={entries} onDone={() => setOpen(false)} />
      </Sheet>
    </section>
  );
}

function RateForm({ entries, onDone }: { entries: Entry[]; onDone: () => void }) {
  const [vals, setVals] = useState(() => Object.fromEntries(entries.map((e) => [e.pillarId, e.score ?? 5])));
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { await A.rateWheel(Object.entries(vals).map(([pillarId, score]) => ({ pillarId, score }))); onDone(); }); }}>
      {entries.map((e) => (
        <label key={e.pillarId} className="block">
          <span className="flex items-baseline justify-between"><span className="font-semibold">{e.name}</span><b className="tnum font-display text-[22px] text-gold">{vals[e.pillarId]}</b></span>
          <input type="range" min={0} max={10} step={1} value={vals[e.pillarId]} onChange={(ev) => setVals((v) => ({ ...v, [e.pillarId]: Number(ev.target.value) }))} className="w-full accent-[var(--color-accent)]" aria-label={`${e.name} من 0 لـ 10`} />
        </label>
      ))}
      <button className="btn btn-primary w-full" aria-busy={pending}>احفظ التقييم</button>
    </form>
  );
}

/** SWOT ← التحدي الأساسي (منهجية §2) */
export function Swot({ items }: { items: { id: string; kind: SwotKind; text: string }[] }) {
  const [adding, setAdding] = useState<SwotKind | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const Q: { k: SwotKind; hint: string; tone: string }[] = [
    { k: "S", hint: "شو بتعمله أحسن من غيرك؟", tone: "text-success" },
    { k: "W", hint: "شو بيوقّفك؟", tone: "text-warning" },
    { k: "O", hint: "شو الفرص برّا؟", tone: "text-info" },
    { k: "T", hint: "شو الخطر برّا؟", tone: "text-danger" },
  ];
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[20px] font-bold">SWOT</h3>
        <span className="text-[11.5px] text-muted">من هون بيطلع التحدي الأساسي</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {Q.map((q) => (
          <div key={q.k} className="min-w-0 rounded-2xl border border-line p-3">
            <div className={`text-[13px] font-bold ${q.tone}`}>{SWOT_LABEL[q.k]}</div>
            <ul className="mt-1 space-y-1">
              {items.filter((i) => i.kind === q.k).map((i) => (
                <li key={i.id} className="group flex items-start gap-1 text-[13.5px] leading-snug">
                  <span className="min-w-0 flex-1">{i.text}</span>
                  <button type="button" aria-label={`احذف «${i.text}»`} className="shrink-0 text-muted" onClick={() => start(async () => { await A.removeSwot(i.id); })}><Icon name="X" size={13} /></button>
                </li>
              ))}
            </ul>
            {adding === q.k ? (
              <form className="mt-1.5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await A.addSwot(q.k, text); if (r.ok) { setText(""); setAdding(null); } }); }}>
                <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={q.hint} className="!py-1.5 !text-[14px]" aria-label={SWOT_LABEL[q.k]} disabled={pending} />
              </form>
            ) : (
              <button type="button" className="mt-1.5 text-[12.5px] text-muted" onClick={() => { setAdding(q.k); setText(""); }}>+ أضف</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
