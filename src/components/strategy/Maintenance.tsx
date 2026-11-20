"use client";
import { useState, useTransition } from "react";
import { Dot } from "@/components/ui/Dot";
import { Sheet } from "@/components/ui/Sheet";
import { MAX_ACTIVE_OKRS, OKR_TYPE_LABEL, type OkrType } from "@/modules/strategy";
import * as A from "@/app/strategy/actions";
import type { StrategyView } from "@/modules/strategy/server";

type G = StrategyView["maintenance"][number];

/**
 * أهداف الصيانة: «الباقي صيانة» (Essentialism). منها بترقّي لأولوية.
 * إذا عندك 3، التطبيق ما بيقبل رابعة: بيسألك شو بدك تشيل (DOET: امنع، لا تحذّر).
 */
export function Maintenance({ goals, okrs }: { goals: G[]; okrs: StrategyView["okrs"] }) {
  const [pick, setPick] = useState<G | null>(null);
  const [type, setType] = useState<OkrType>("COMMITTED");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const full = okrs.length >= MAX_ACTIVE_OKRS;
  const groups = new Map<string, G[]>();
  for (const g of goals) groups.set(g.pillar, [...(groups.get(g.pillar) ?? []), g]);
  const close = () => { setPick(null); setError(null); };

  return (
    <details className="card group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span>
          <span className="font-bold">أهداف الصيانة</span> <span className="tnum text-muted">({goals.length})</span>
          <span className="block text-[15px] text-muted">ماشية بالحد الأدنى هالربع. منها بترقّي لأولوية.</span>
        </span>
        <span className="text-muted transition group-open:rotate-180" aria-hidden>⌄</span>
      </summary>
      <div className="mt-4 space-y-4 border-t border-line pt-4">
        {[...groups.entries()].map(([pillar, list]) => (
          <div key={pillar}>
            <div className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-muted"><Dot color={list[0].color} /> {pillar}</div>
            <ul>
              {list.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 leading-snug">{g.title}</span>
                  <button type="button" className="btn btn-text btn-sm shrink-0" onClick={() => setPick(g)}>رقّيها ↑</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Sheet open={!!pick} onClose={close} title={full ? "عندك 3 أولويات. شو بدك تشيل؟" : "رقّيها لأولوية الربع"}>
        {pick && (
          <div className="space-y-4">
            <p className="text-[15px] text-muted">
              «{pick.title}»{full ? " بتاخد مكان وحدة من هدول، والي بتشيلها بترجع صيانة." : ""} (Essentialism: 1-3 أولويات بس)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["COMMITTED", "ASPIRATIONAL"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`btn btn-sm ${type === t ? "btn-secondary ring-2 ring-accent" : ""}`}>{OKR_TYPE_LABEL[t]}</button>
              ))}
            </div>
            {full ? (
              <ul className="space-y-2">
                {okrs.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="btn w-full justify-between text-start"
                      aria-busy={pending}
                      onClick={() => start(async () => { const r = await A.swapOkr(o.id, pick.id, type); if (r.ok) close(); else setError(r.message); })}
                    >
                      <span>شيل: {o.title}</span><span className="text-muted">أولوية {o.rank}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <button
                type="button"
                className="btn btn-primary w-full"
                aria-busy={pending}
                onClick={() => start(async () => { const r = await A.promote(pick.id, type); if (r.ok) close(); else setError(r.message); })}
              >
                رقّيها لأولوية {okrs.length + 1}
              </button>
            )}
            {error && <p className="text-[15px] text-danger">{error}</p>}
          </div>
        )}
      </Sheet>
    </details>
  );
}
