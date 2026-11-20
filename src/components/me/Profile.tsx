"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { AREA_LABEL, PROFILE_AREAS, type ProfileArea } from "@/modules/profile";
import type { FactView, PersonView } from "@/modules/profile/server";
import * as A from "@/app/me/actions";

const SOURCE: Record<FactView["source"], string> = { DATA: "من أرقامك", CLAUDE: "من كلامك", ME: "إنت كتبتها" };

/** حقيقة وحدة: ✓ صح، ✎ صحّح، ✕ غلط. التصحيح هو الي بيخلّي التطبيق يعرفك (مش تدريب نموذج) */
export function FactCard({ f }: { f: FactView }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(f.text);
  const [pending, start] = useTransition();
  const confirmed = f.status === "CONFIRMED";
  return (
    <li className={`card p-4 ${pending ? "opacity-60" : ""}`}>
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await A.correctFact(f.id, text);
              if (r.ok) setEditing(false);
            });
          }}
        >
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus aria-label="صحّح الجملة" />
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm flex-1" disabled={pending}>احفظ الصح</button>
            <button type="button" className="btn btn-sm" onClick={() => { setText(f.text); setEditing(false); }}>إلغاء</button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            {confirmed ? (
              <svg viewBox="-8 -8 16 16" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-gold" aria-label="مؤكّدة"><path d="M0 -7 Q1.2 -1.2 7 0 Q1.2 1.2 0 7 Q-1.2 1.2 -7 0 Q-1.2 -1.2 0 -7Z" fill="currentColor" /></svg>
            ) : (
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full border border-gold" aria-label="جديدة" />
            )}
            <p className="min-w-0 flex-1 leading-relaxed">{f.text}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ps-6 text-[12.5px] text-muted">
            <span className="rounded-full bg-surface-2 px-2 py-0.5">{SOURCE[f.source]}</span>
            {f.evidence && <span className="min-w-0">{f.evidence}</span>}
          </div>
          <div className="mt-3 flex gap-2 ps-6">
            {!confirmed && (
              <button type="button" className="btn btn-sm flex-1" disabled={pending} onClick={() => start(async () => { await A.confirmFact(f.id); })}>
                <Icon name="Check" size={16} /> صح
              </button>
            )}
            <button type="button" className="btn btn-sm flex-1" disabled={pending} onClick={() => setEditing(true)}>
              <Icon name="Pen" size={15} /> صحّح
            </button>
            <button type="button" className="btn btn-text btn-sm h-10 w-10 p-0 text-muted" aria-label="غلط، شيلها" disabled={pending} onClick={() => start(async () => { await A.rejectFact(f.id); })}>
              <Icon name="X" size={17} />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

/** «علّمني عنك»: جملة بإيده بمجال يختاره */
export function AddFact() {
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState<ProfileArea>("TRIGGERS");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-sm shrink-0 whitespace-nowrap" onClick={() => setOpen(true)}><Icon name="Plus" size={16} /> علّمني عنك</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="علّمني شي عنك">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await A.addFact(area, text);
              if (!r.ok) return setError(r.message);
              setText(""); setError(null); setOpen(false);
            });
          }}
        >
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المجال">
            {PROFILE_AREAS.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={area === a} onClick={() => setArea(a)} className={`btn btn-sm ${area === a ? "btn-primary" : ""}`}>{AREA_LABEL[a].title}</button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-[14px] text-muted">{AREA_LABEL[area].hint}</span>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً: لما أنام أقل من 6 ساعات بعصّب بسرعة وبأجّل كل شي" />
          </label>
          {error && <p className="text-[14px] text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>احفظ</button>
        </form>
      </Sheet>
    </>
  );
}

/** «تعلّم من كلامي»: Claude بيقرأ آخر أسبوعين */
export function LearnButton({ connected }: { connected: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={pending}
        onClick={() => start(async () => { const r = await A.learnNow(); setMsg(r.message ?? null); })}
      >
        <Icon name="Brain" size={18} /> {pending ? "عم بقرأ كلامك…" : "تعلّم من كلامي"}
      </button>
      <p className="mt-2 text-center text-[13px] text-muted" aria-live="polite">
        {msg ?? (connected ? "بيقرأ تسجيلاتك بآخر أسبوعين وبيطلّع شو فهم عنك. إنت بتأكّد أو بتصحّح." : "بيشتغل لما ينحط مفتاح Claude. هلّق بيتعلّم من أرقامك بس.")}
      </p>
    </div>
  );
}

/** الي رفضته: مخفية، وبترجّعها إذا غيّرت رأيك */
export function Rejected({ items }: { items: FactView[] }) {
  const [pending, start] = useTransition();
  if (!items.length) return null;
  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-[15px] text-muted">شلت <bdi className="tnum">{items.length}</bdi> أشياء غلط، وما رح ترجع</summary>
      <ul className="mt-3 space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-start gap-2 text-[14px] text-muted">
            <span className="min-w-0 flex-1 line-through decoration-1">{f.text}</span>
            <button type="button" className="btn btn-text btn-sm h-9 w-9 p-0" aria-label="رجّعها" disabled={pending} onClick={() => start(async () => { await A.restoreFact(f.id); })}>
              <Icon name="RotateCcw" size={15} />
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

const ago = (ymd: string | null, today: string) => {
  if (!ymd) return "ما في تواصل مسجّل";
  const d = Math.round((Date.parse(today) - Date.parse(ymd)) / 864e5);
  return d <= 0 ? "حكيتوا اليوم" : d === 1 ? "حكيتوا مبارح" : `آخر تواصل من ${d} يوم`;
};

/** دفتر العلاقات (Carnegie): الناس المهمين، ومين صرلك زمان ما حكيت معه */
export function People({ people, today }: { people: PersonView[]; today: string }) {
  const [edit, setEdit] = useState<PersonView | "new" | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="space-y-3" aria-labelledby="ppl-h">
      <div className="flex items-baseline justify-between">
        <h2 id="ppl-h" className="font-display text-[23px] font-bold">ناسك</h2>
        <button type="button" className="btn btn-text btn-sm -me-2" onClick={() => setEdit("new")}><Icon name="Plus" size={16} /> شخص</button>
      </div>
      {people.length === 0 ? (
        <p className="card p-5 text-center text-[15px] text-muted">أهلك، صحابك، الناس الي بتشتغل معهم. المستشار بيذكّرك بمين صرلك زمان ما حكيت معه <bdi dir="ltr">(Carnegie)</bdi>.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {people.map((p) => {
            const stale = !p.lastContact || Date.parse(today) - Date.parse(p.lastContact) > 14 * 864e5;
            return (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-[18px] font-bold text-gold" aria-hidden>{p.name.trim()[0]}</span>
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setEdit(p)}>
                  <span className="block font-bold leading-snug">{p.name}{p.relation && <span className="font-normal text-muted"> · {p.relation}</span>}</span>
                  <span className={`block text-[13.5px] ${stale ? "text-warning" : "text-muted"}`}>{ago(p.lastContact, today)}{p.note && ` · ${p.note}`}</span>
                </button>
                <button type="button" className="btn btn-sm shrink-0" disabled={pending} onClick={() => start(async () => { await A.touchPerson(p.id); })}>حكينا</button>
              </li>
            );
          })}
        </ul>
      )}
      <PersonSheet person={edit} onClose={() => setEdit(null)} />
    </section>
  );
}

function PersonSheet({ person, onClose }: { person: PersonView | "new" | null; onClose: () => void }) {
  const p = person && person !== "new" ? person : null;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Sheet open={!!person} onClose={onClose} title={p ? p.name : "شخص جديد"}>
      <form
        key={p?.id ?? "new"}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await A.savePerson(p?.id ?? null, { name: String(fd.get("name") ?? ""), relation: String(fd.get("relation") ?? ""), note: String(fd.get("note") ?? "") });
            if (!r.ok) return setError(r.message);
            setError(null); onClose();
          });
        }}
      >
        <label className="block"><span className="mb-1 block font-bold">الاسم</span><input name="name" defaultValue={p?.name ?? ""} placeholder="مثلاً: أمي" required /></label>
        <label className="block"><span className="mb-1 block font-bold">شو بيكون إلك</span><input name="relation" defaultValue={p?.relation ?? ""} placeholder="أهل، صاحب، شغل…" /></label>
        <label className="block"><span className="mb-1 block font-bold">ملاحظة</span><textarea name="note" rows={2} defaultValue={p?.note ?? ""} placeholder="شو بيحب، شو صار معه آخر مرة، شو وعدته" /></label>
        {error && <p className="text-[14px] text-danger">{error}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={pending}>احفظ</button>
          {p && (
            <button type="button" className="btn btn-text text-danger" disabled={pending} onClick={() => start(async () => { await A.removePerson(p.id); onClose(); })}>
              <Icon name="Trash2" size={16} /> احذف
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
