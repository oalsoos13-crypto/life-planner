"use client";
import { useState, useTransition } from "react";
import { withBuffer } from "@/shared/kernel/values";
import * as A from "@/app/strategy/actions";

/** ميزانية الوقت (Essentialism: هامش 50%). الأحمر الوحيد بالشاشة لما تزيد (LUX: فون ريستورف) */
export function TimeBudget({ cycleId, free, planned }: { cycleId: string; free: number | null; planned: number }) {
  const [v, setV] = useState(free?.toString() ?? "");
  const [pending, start] = useTransition();
  const need = withBuffer(planned);
  const over = free != null && need > free;
  const pct = free ? Math.min(100, (need / free) * 100) : 0;
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold">ميزانية الوقت بالأسبوع</h3>
        <span className={`tnum text-[15px] ${over ? "font-bold text-danger" : "text-muted"}`}>
          <bdi>{need}</bdi> من <bdi>{free ?? "؟"}</bdi> ساعة
        </span>
      </div>
      <div className="bar mt-2"><span style={{ width: `${pct}%`, background: over ? "var(--color-danger)" : undefined }} /></div>
      <p className="mt-2 text-[15px] text-muted">
        {planned === 0
          ? "حدّد ساعات كل أولوية من «تعديل» عشان نعرف إذا الخطة بتوسع بأسبوعك."
          : over
            ? `زايد ${Math.round((need - free!) * 10) / 10} ساعة. قلّل ساعات أو أولوية.`
            : `${planned} ساعة + هامش 50%، بتوسع.`}
      </p>
      <label className="mt-3 flex items-center gap-2 text-[15px]">
        <span className="shrink-0 text-muted">ساعاتك الحرة الحقيقية:</span>
        <input
          inputMode="decimal"
          dir="ltr"
          className="tnum w-20 text-center"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => start(async () => void (await A.saveFreeHours(cycleId, v.trim() === "" ? null : Number(v))))}
          aria-busy={pending}
        />
      </label>
    </section>
  );
}
