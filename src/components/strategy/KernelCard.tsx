"use client";
import { EditableText } from "@/components/ui/EditableText";
import { CHALLENGE_MAX } from "@/modules/strategy";
import * as A from "@/app/strategy/actions";
import type { StrategyView } from "@/modules/strategy/server";

/** بطاقة النواة (Rumelt): التشخيص ← السياسة الموجّهة ← النيّة الجوهرية. معروضة فوق كل الاستراتيجية */
export function KernelCard({ cycleId, kernel }: { cycleId: string; kernel: StrategyView["kernel"] }) {
  const save = (f: "coreChallenge" | "guidingPolicy" | "guidingPolicyNot" | "essentialIntent") => (v: string) => A.saveKernelField(cycleId, f, v);
  return (
    <section className="card overflow-hidden" aria-labelledby="kernel-h">
      <h2 id="kernel-h" className="sr-only">نواة الاستراتيجية</h2>
      {/* النيّة الجوهرية: الشي «الثمين» بالذهبي (SLC، دليل الواجهات §3.1) */}
      <div className="bg-gold-soft px-4 pb-4 pt-3">
        <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-gold">
          <span aria-hidden>◆</span> النيّة الجوهرية للربع
        </div>
        <EditableText
          label="النيّة الجوهرية"
          value={kernel?.essentialIntent ?? null}
          placeholder="شو الشي الوحيد الي إذا صار، الربع نجح؟"
          onSave={save("essentialIntent")}
          className="text-[19px] font-extrabold leading-snug"
        />
      </div>
      <div className="space-y-5 p-4">
        <div>
          <div className="mb-1 text-[13px] font-bold text-muted">التحدي الأساسي</div>
          <EditableText
            label="التحدي الأساسي"
            value={kernel?.coreChallenge ?? null}
            placeholder="شو أكبر عقبة بينك وبين الي بدك ياه؟ (جملة وحدة)"
            onSave={save("coreChallenge")}
            maxLength={CHALLENGE_MAX}
            className="font-bold leading-relaxed"
          />
        </div>
        <div>
          <div className="mb-1 text-[13px] font-bold text-muted">السياسة الموجّهة: رح أتعامل معه عن طريق…</div>
          <EditableText label="السياسة الموجّهة" value={kernel?.guidingPolicy ?? null} placeholder="رح أتعامل مع التحدي عن طريق…" onSave={save("guidingPolicy")} />
          <div className="mt-3 border-s-2 border-line ps-3">
            <div className="mb-0.5 text-[13px] font-bold text-muted">…ومش عن طريق</div>
            <EditableText label="ومش عن طريق" value={kernel?.guidingPolicyNot ?? null} placeholder="شو الطريق الي قررت ما تمشي فيه؟" onSave={save("guidingPolicyNot")} className="text-muted" />
          </div>
        </div>
      </div>
    </section>
  );
}
