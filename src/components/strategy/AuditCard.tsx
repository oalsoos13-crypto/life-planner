import type { Warning } from "@/modules/strategy";

/** فحص «الاستراتيجية السيئة» (Rumelt): ✓/⚠ بكل بند مع الإصلاح ومصدره (DOET: القيود) */
export function AuditCard({ warnings, total = 12 }: { warnings: Warning[]; total?: number }) {
  const passed = Math.max(0, total - new Set(warnings.map((w) => w.code)).size);
  if (!warnings.length)
    return (
      <section className="card flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-lg text-accent">✓</span>
        <div>
          <div className="font-bold">استراتيجيتك نظيفة</div>
          <div className="text-[15px] text-muted">مرّت على كل فحوصات «الاستراتيجية السيئة»</div>
        </div>
      </section>
    );
  return (
    <details className="card group p-4">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft font-extrabold text-gold">{warnings.length}</span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">فحص الاستراتيجية: {warnings.length} شغلات بدها انتباه</div>
          <div className="text-[15px] text-muted">
            <bdi className="tnum">{passed}</bdi> من <bdi className="tnum">{total}</bdi> فحوصات ✓ · اكبس لتشوفها
          </div>
        </div>
        <span className="text-muted transition group-open:rotate-180" aria-hidden>⌄</span>
      </summary>
      <ul className="mt-4 space-y-3 border-t border-line pt-4">
        {warnings.map((w, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 text-warning" aria-label="تنبيه">⚠</span>
            <div className="min-w-0">
              <div className="font-bold leading-snug">{w.message}</div>
              <div className="text-[15px] text-muted">
                {w.fix} · <span className="text-[13px]">{w.book}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
