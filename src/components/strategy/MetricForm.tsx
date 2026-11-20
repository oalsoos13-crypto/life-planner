"use client";
import { useState, useTransition } from "react";

export type MetricDraft = { name: string; unit: string; start: string; target: string; direction: "UP" | "DOWN"; role: "LEADING" | "LAGGING" };

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

/** نموذج مؤشر: «النتيجة الرئيسية رقم مش مهمة» (Doerr). بنسأل من كم لكم */
export function MetricForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
  showRole = true,
}: {
  initial?: Partial<MetricDraft>;
  submitLabel: string;
  onSubmit: (m: { name: string; unit: string | null; start: number | null; target: number | null; direction: "UP" | "DOWN"; role: "LEADING" | "LAGGING" }) => Promise<{ ok: boolean; message?: string }>;
  onDelete?: () => Promise<unknown>;
  showRole?: boolean;
}) {
  const [m, setM] = useState<MetricDraft>({ name: "", unit: "", start: "", target: "", direction: "UP", role: "LAGGING", ...initial });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (p: Partial<MetricDraft>) => setM((x) => ({ ...x, ...p }));
  const taskLike = m.name.trim() && m.target.trim() === "";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!m.name.trim()) return setError("شو اسم الرقم الي بتقيسه؟");
        const s = num(m.start), t = num(m.target);
        if ((s != null && !Number.isFinite(s)) || (t != null && !Number.isFinite(t))) return setError("البداية والهدف لازم يكونوا أرقام");
        start(async () => {
          const r = await onSubmit({ name: m.name.trim(), unit: m.unit.trim() || null, start: s, target: t, direction: m.direction, role: m.role });
          if (!r.ok) setError(r.message ?? "ما انحفظ");
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">شو الرقم؟</span>
        <input value={m.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً: مستخدمون نشطون" />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-muted">من</span>
          <input inputMode="decimal" dir="ltr" className="tnum text-center" value={m.start} onChange={(e) => set({ start: e.target.value })} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-muted">لـ</span>
          <input inputMode="decimal" dir="ltr" className="tnum text-center" value={m.target} onChange={(e) => set({ target: e.target.value })} placeholder="1000" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-muted">الوحدة</span>
          <input value={m.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="مستخدم" />
        </label>
      </div>
      {taskLike && <p className="text-[15px] text-warning">⚠ بدون رقم هدف هاي مهمة مش نتيجة. كم بدك توصل؟</p>}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="الاتجاه">
        {(["UP", "DOWN"] as const).map((d) => (
          <button key={d} type="button" role="radio" aria-checked={m.direction === d} onClick={() => set({ direction: d })} className={`btn ${m.direction === d ? "btn-secondary ring-2 ring-accent" : ""}`}>
            {d === "UP" ? "↗ لازم يطلع" : "↘ لازم ينزل"}
          </button>
        ))}
      </div>
      {showRole && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع المؤشر">
          {(["LAGGING", "LEADING"] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={m.role === r} onClick={() => set({ role: r })} className={`btn btn-sm ${m.role === r ? "btn-secondary ring-2 ring-accent" : ""}`}>
              {r === "LAGGING" ? "نتيجة (تابع)" : "سلوك بإيدي (قائد)"}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-[15px] text-danger">{error}</p>}
      <button className="btn btn-primary w-full" aria-busy={pending}>{pending ? "عم يحفظ…" : submitLabel}</button>
      {onDelete && (
        <button type="button" className="btn btn-danger w-full" onClick={() => start(async () => void (await onDelete()))}>
          احذف المؤشر
        </button>
      )}
    </form>
  );
}
