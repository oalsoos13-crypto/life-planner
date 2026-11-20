"use client";
import { useState, useTransition } from "react";
import { Dot } from "@/components/ui/Dot";
import * as A from "@/app/strategy/actions";
import type { StrategyView } from "@/modules/strategy/server";

/** قائمة «لا» (Essentialism): التقصير الاستراتيجي عن قصد، بدون ذنب */
export function NotDoing({ cycleId, items }: { cycleId: string; items: StrategyView["notDoing"] }) {
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ text: string; reason: string | null } | null>(null);
  return (
    <section className="card p-4">
      <ul className="space-y-3">
        {items.map((n) => (
          <li key={n.id} className="flex items-start gap-3">
            <span className="mt-0.5 text-muted" aria-hidden>⊘</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold leading-snug">{n.text}</div>
              <div className="flex items-center gap-1.5 text-[15px] text-muted">
                {n.pillar && <><Dot color={n.color} /> {n.pillar} ·</>} {n.reason}
              </div>
            </div>
            <button
              type="button"
              aria-label={`شيل «${n.text}»`}
              className="btn btn-text btn-sm h-11 w-11 p-0 text-muted"
              onClick={() => start(async () => { await A.removeNo(n.id); setUndo({ text: n.text, reason: n.reason }); setTimeout(() => setUndo(null), 5000); })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {undo && (
        <div className="rise mt-3 flex items-center justify-between rounded-xl bg-ink px-3 py-2 text-[15px] text-bg">
          <span>انشال «{undo.text}»</span>
          <button type="button" className="font-bold text-accent-soft" onClick={() => start(async () => { await A.addNo(cycleId, undo.text, undo.reason ?? ""); setUndo(null); })}>تراجع</button>
        </div>
      )}
      <form
        className="mt-4 space-y-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await A.addNo(cycleId, text, reason);
            if (r.ok) { setText(""); setReason(""); setError(null); } else setError(r.message);
          });
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="شو رح تترك عن قصد هالربع؟" aria-label="بند جديد بقائمة لا" />
        {text.trim() && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ليش؟ (اختياري)" aria-label="السبب" />}
        {error && <p className="text-[15px] text-danger">{error}</p>}
        {text.trim() && <button className="btn btn-secondary w-full" aria-busy={pending}>أضف لقائمة «لا»</button>}
      </form>
    </section>
  );
}
