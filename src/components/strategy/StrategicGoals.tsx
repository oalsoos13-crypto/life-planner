"use client";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { MetricForm } from "./MetricForm";
import { MAP_ORDER, PERSPECTIVE_LABEL, type Perspective } from "@/modules/strategy";
import * as A from "@/app/strategy/actions";
import type { StrategyView } from "@/modules/strategy/server";

type Sg = StrategyView["strategicGoals"][number];
const fmt = (n: number | null) => (n == null ? "؟" : String(n));

/**
 * الأهداف الاستراتيجية لـ 3 سنين بالمنظورات الأربعة (Balanced Scorecard)،
 * مرتبة كخريطة الاستراتيجية: المال فوق، التعلّم تحت (التعلّم بيغذّي النظام، والنظام بيغذّي الأثر، والأثر المال).
 */
export function StrategicGoals({ sgs, okrs }: { sgs: Sg[]; okrs: StrategyView["okrs"] }) {
  const [sheet, setSheet] = useState<null | { kind: "new"; p: Perspective } | { kind: "edit"; sg: Sg } | { kind: "metric"; sg: Sg }>(null);
  const close = () => setSheet(null);
  return (
    <div className="space-y-2">
      {MAP_ORDER.map((p, i) => {
        const list = sgs.filter((s) => s.perspective === p);
        return (
          <div key={p}>
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-muted">{PERSPECTIVE_LABEL[p]}</h3>
                <button type="button" className="btn btn-text btn-sm -me-2" onClick={() => setSheet({ kind: "new", p })}>+ هدف</button>
              </div>
              {list.length === 0 && <p className="text-[15px] text-warning">⚠ ولا هدف بهالمنظور</p>}
              <ul className="space-y-3">
                {list.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setSheet({ kind: "edit", sg: s })} className="block w-full text-start font-bold leading-snug">
                      {s.title}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {s.metrics.map((m) => (
                        <span key={m.id} className="badge">
                          {m.name}: <bdi className="tnum">{fmt(m.latest ?? m.start)}</bdi> من <bdi className="tnum">{fmt(m.target)}</bdi>
                        </span>
                      ))}
                      {s.metrics.length === 0 && (
                        <button type="button" className="badge bg-gold-soft text-gold" onClick={() => setSheet({ kind: "metric", sg: s })}>+ مؤشر (ناقص)</button>
                      )}
                      {okrs.filter((o) => s.okrIds.includes(o.id)).map((o) => (
                        <span key={o.id} className="badge bg-accent-soft text-accent">أولوية {o.rank}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {i < MAP_ORDER.length - 1 && <div className="py-0.5 text-center text-[13px] text-muted" aria-hidden>▲ بيغذّيه</div>}
          </div>
        );
      })}

      <Sheet open={sheet?.kind === "new" || sheet?.kind === "edit"} onClose={close} title={sheet?.kind === "edit" ? "عدّل الهدف الاستراتيجي" : "هدف استراتيجي جديد"}>
        {(sheet?.kind === "new" || sheet?.kind === "edit") && <SgForm key={sheet.kind === "edit" ? sheet.sg.id : sheet.p} sheet={sheet} onDone={close} onMetric={(sg) => setSheet({ kind: "metric", sg })} />}
      </Sheet>
      <Sheet open={sheet?.kind === "metric"} onClose={close} title="مؤشر الهدف الاستراتيجي">
        {sheet?.kind === "metric" && (
          <>
            <p className="mb-4 text-[15px] text-muted">شو الرقم الي بيقلّك بعد 3 سنين إنك وصلت؟</p>
            <MetricForm submitLabel="أضف المؤشر" onSubmit={async (m) => { const r = await A.addSgMetric(sheet.sg.id, m); if (r.ok) close(); return r; }} />
          </>
        )}
      </Sheet>
    </div>
  );
}

function SgForm({ sheet, onDone, onMetric }: { sheet: { kind: "new"; p: Perspective } | { kind: "edit"; sg: Sg }; onDone: () => void; onMetric: (sg: Sg) => void }) {
  const editing = sheet.kind === "edit" ? sheet.sg : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [p, setP] = useState<Perspective>(editing?.perspective ?? (sheet.kind === "new" ? sheet.p : "FINANCE"));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await A.saveSg({ id: editing?.id, title, perspective: p });
          if (r.ok) onDone();
          else setError(r.message);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">وين بدك تكون بعد 3 سنين؟</span>
        <textarea rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: دخل المشروع ≥ دخل الوظيفة" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MAP_ORDER.map((x) => (
          <button key={x} type="button" aria-pressed={p === x} onClick={() => setP(x)} className={`btn btn-sm ${p === x ? "btn-secondary ring-2 ring-accent" : ""}`}>
            {PERSPECTIVE_LABEL[x]}
          </button>
        ))}
      </div>
      {error && <p className="text-[15px] text-danger">{error}</p>}
      <button className="btn btn-primary w-full" aria-busy={pending}>احفظ الهدف</button>
      {editing && (
        <>
          <button type="button" className="btn btn-secondary w-full" onClick={() => onMetric(editing)}>+ مؤشر</button>
          <button type="button" className="btn btn-danger w-full" onClick={() => start(async () => { await A.archiveSg(editing.id); onDone(); })}>أرشف الهدف</button>
        </>
      )}
    </form>
  );
}
