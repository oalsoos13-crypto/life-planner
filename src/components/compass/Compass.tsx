"use client";
import { useState, useTransition } from "react";
import { EditableText } from "@/components/ui/EditableText";
import { Icon } from "@/components/ui/Icon";
import { principleShape, VALUES_MAX, type CompassItemKind, type CompassTextField } from "@/modules/direction";
import * as A from "@/app/compass/actions";

/** حقل بوصلة بعنوان وسؤال المنهجية ومرجعه */
export function CompassField({ field, title, prompt, source, value, big }: { field: CompassTextField; title: string; prompt: string; source: string; value: string | null; big?: boolean }) {
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[20px] font-bold">{title}</h3>
        <span className="text-[11.5px] text-muted">{source}</span>
      </div>
      <EditableText label={title} value={value} placeholder={prompt} onSave={(v) => A.saveCompass(field, v)} className={big ? "font-display text-[21px] leading-[1.6]" : "leading-relaxed"} />
    </section>
  );
}

const KIND_META: Record<CompassItemKind, { title: string; source: string; placeholder: string; detail?: string; empty: string }> = {
  VALUE: { title: "قيمك", source: "DYL · Christensen", placeholder: "القيمة، مثلاً: الأمانة", detail: "تعريفها بسلوك: «يعني ما بوعد بشي ما بقدر عليه»", empty: "3 لـ 5 قيم بالكتير. كل قيمة إلها سلوك بينشاف." },
  PRINCIPLE: { title: "مبادئك", source: "Dalio · Christensen", placeholder: "لما ___، بعمل ___، لأنه ___", empty: "قواعد جاهزة للمواقف الي بتتكرّر، عشان ما تقرّر من الصفر كل مرة." },
  IDENTITY: { title: "مين أنا", source: "Atomic Habits", placeholder: "أنا شخص بيمشي كل يوم", empty: "كل عادة صوت لهوية. اكتب الشخص الي بدك تصيره." },
};

/** قائمة عناصر البوصلة (قيم، مبادئ، هوية) مع إضافة وحذف */
export function CompassItems({ kind, items }: { kind: CompassItemKind; items: { id: string; text: string; detail: string | null }[] }) {
  const m = KIND_META[kind];
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hint = kind === "PRINCIPLE" && text.trim().length > 6 ? principleShape(text).hint : null;
  const full = kind === "VALUE" && items.length >= VALUES_MAX;
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[20px] font-bold">{m.title}</h3>
        <span className="text-[11.5px] text-muted">{m.source}</span>
      </div>
      {items.length === 0 && <p className="mt-1 text-[14px] text-muted">{m.empty}</p>}
      <ul className="mt-2 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-2.5">
            <svg viewBox="-8 -8 16 16" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden><path d="M0 -7 Q1.2 -1.2 7 0 Q1.2 1.2 0 7 Q-1.2 1.2 -7 0 Q-1.2 -1.2 0 -7Z" fill="currentColor" /></svg>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-snug">{it.text}</div>
              {it.detail && <div className="text-[14px] text-muted">{it.detail}</div>}
            </div>
            <button type="button" aria-label={`احذف «${it.text}»`} className="btn btn-text btn-sm h-9 w-9 p-0 text-muted" onClick={() => start(async () => { await A.removeItem(it.id); })}>
              <Icon name="X" size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!full && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await A.addItem(kind, text, detail);
              if (r.ok) { setText(""); setDetail(""); setError(null); } else setError(r.message);
            });
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={m.placeholder} aria-label={m.title} />
          {m.detail && text.trim() && <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={m.detail} aria-label="التعريف السلوكي" />}
          {hint && <p className="text-[13px] text-warning">{hint}</p>}
          {error && <p className="text-[14px] text-danger">{error}</p>}
          {text.trim() && <button className="btn btn-secondary btn-sm" aria-busy={pending}><Icon name="Plus" size={16} /> أضف</button>}
        </form>
      )}
    </section>
  );
}

/** رقم «كفاية» (Housel): قديش بالشهر بيكفيك لتعيش الحياة الي بدك إياها */
export function EnoughCard({ value, note }: { value: number | null; note: string | null }) {
  const [v, setV] = useState(value?.toString() ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[20px] font-bold">رقم «كفاية»</h3>
        <span className="text-[11.5px] text-muted">Housel</span>
      </div>
      <p className="text-[14px] text-muted">قديش بالشهر بيكفيك تعيش الحياة الي بدك إياها؟ لما المشروع يغطّيه 6 أشهر ورا بعض، بتصير حر تقرّر.</p>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const n = v.trim() ? Number(v) : null;
            const r = await A.saveEnough(n, note ?? undefined);
            setMsg(r.ok ? "✓ انحفظ" : r.message);
          });
        }}
      >
        <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="مثلاً 900" className="tnum w-36" aria-label="رقم كفاية بالدينار" />
        <span className="text-muted">د.ك بالشهر</span>
        <button className="btn btn-secondary btn-sm ms-auto" aria-busy={pending}>احفظ</button>
      </form>
      {msg && <p className="saved-flash mt-1 text-[13px] text-success">{msg}</p>}
    </section>
  );
}
