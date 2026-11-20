"use client";
import { useTransition } from "react";
import * as A from "@/app/strategy/actions";

export function ConfirmDraft({ cycleId }: { cycleId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4">
      <span aria-hidden className="mt-0.5">✎</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">هاي مسودة من المنهجية، مبنية على الي حكيتلي ياه</p>
        <p className="text-[15px] text-muted">اكبس على أي نص لتعدّله. لما تقتنع فيها، ثبّتها.</p>
        <button type="button" className="btn btn-secondary btn-sm mt-2" aria-busy={pending} onClick={() => start(async () => void (await A.confirmStrategy(cycleId)))}>
          {pending ? "…" : "ثبّت الاستراتيجية"}
        </button>
      </div>
    </div>
  );
}
