"use client";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { BIASES, decisionGaps, ninetyRule, type DecisionOption } from "@/modules/direction";
import type { DecisionView } from "@/modules/direction/server";
import * as A from "@/app/compass/actions";
import { askAdvisor } from "@/app/today/actions";

const STATUS: Record<string, { l: string; c: string }> = {
  OPEN: { l: "مفتوح", c: "text-info" },
  DECIDED: { l: "تقرّر", c: "text-gold" },
  REVIEWED: { l: "انراجع", c: "text-success" },
};

export function DecisionsList({ items, today, connected }: { items: DecisionView[]; today: string; connected: boolean }) {
  const [edit, setEdit] = useState<DecisionView | "new" | null>(null);
  return (
    <div className="space-y-3">
      <button type="button" className="btn btn-primary w-full" onClick={() => setEdit("new")}><Icon name="Plus" size={18} /> قرار جديد</button>
      {items.length === 0 && <p className="card p-5 text-center text-[15px] text-muted">أي قرار كبير (شغل، مصاري، مشروع، علاقة) اكتبه هون. القرار المكتوب بيتراجع، والي بالراس بيتنسى <bdi dir="ltr">(Kahneman · Dalio)</bdi>.</p>}
      <ul className="space-y-2">
        {items.map((d) => {
          const due = d.status === "DECIDED" && d.reviewAt && d.reviewAt <= today;
          return (
            <li key={d.id}>
              <button type="button" onClick={() => setEdit(d)} className="card block w-full p-4 text-start">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-bold leading-snug">{d.title}</span>
                  <span className={`shrink-0 text-[12.5px] font-bold ${due ? "text-warning" : STATUS[d.status]?.c}`}>{due ? "وقت المراجعة" : STATUS[d.status]?.l}</span>
                </span>
                {d.chosen && <span className="block text-[14px] text-muted">اخترت: {d.chosen}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "قرار جديد" : "القرار"}>
        {edit && <DecisionForm key={edit === "new" ? "new" : edit.id} d={edit === "new" ? null : edit} connected={connected} onDone={() => setEdit(null)} />}
      </Sheet>
    </div>
  );
}

function DecisionForm({ d, connected, onDone }: { d: DecisionView | null; connected: boolean; onDone: () => void }) {
  const [title, setTitle] = useState(d?.title ?? "");
  const [context, setContext] = useState(d?.context ?? "");
  const [options, setOptions] = useState<DecisionOption[]>(d?.options.length ? d.options : [{ text: "", score: null }, { text: "ما أعمل شي / أضل متل ما أنا", score: null }]);
  const [premortem, setPremortem] = useState(d?.premortem ?? "");
  const [outsideView, setOutsideView] = useState(d?.outsideView ?? "");
  const [biases, setBiases] = useState<string[]>(d?.biases ?? []);
  const [chosen, setChosen] = useState(d?.chosen ?? "");
  const [why, setWhy] = useState(d?.why ?? "");
  const [reviewAt, setReviewAt] = useState(d?.reviewAt ?? "");
  const [outcome, setOutcome] = useState(d?.outcome ?? "");
  const [lesson, setLesson] = useState(d?.lesson ?? "");
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [thinking, think] = useTransition();
  const rule = ninetyRule(options);
  const gaps = decisionGaps({ options, premortem, biases, reviewAt: reviewAt || null, chosen, why });
  const setOpt = (i: number, p: Partial<DecisionOption>) => setOptions((o) => o.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const ask = () =>
    think(async () => {
      const q = `ساعدني بهالقرار: «${title}».\nالسياق: ${context || "—"}\nالخيارات وتقييمي من 10: ${options.filter((o) => o.text).map((o) => `${o.text} (${o.score ?? "؟"})`).join("، ")}\nPremortem: ${premortem || "—"}\nالرؤية من برّا: ${outsideView || "—"}\nطبّق قاعدة 90% وفحص التحيّزات، وقلّي شو بتنصح وليش، وشو ممكن يخرب.`;
      const r = await askAdvisor(q);
      setAdvice(r.ok ? r.answer : r.message);
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await A.saveDecision(d?.id ?? null, { title, context, options, chosen, why, premortem, outsideView, biases, reviewAt: reviewAt || null, outcome, lesson });
          if (r.ok) onDone(); else setError(r.message);
        });
      }}
    >
      <label className="block"><span className="mb-1 block font-bold">شو القرار؟</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: أترك الكافيه وأتفرّغ للمجدّد؟" /></label>
      <label className="block"><span className="mb-1 block font-bold">السياق</span><textarea rows={2} value={context} onChange={(e) => setContext(e.target.value)} placeholder="ليش هلّق؟ شو بيتغيّر؟" /></label>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold">الخيارات وقديش «أكيد نعم» من 10</legend>
        {options.map((o, i) => (
          <div key={i} className="rounded-2xl border border-line p-3">
            <input value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} placeholder={`خيار ${i + 1}`} aria-label={`خيار ${i + 1}`} />
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min={0} max={10} value={o.score ?? 5} onChange={(e) => setOpt(i, { score: Number(e.target.value) })} className="flex-1 accent-[var(--color-accent)]" aria-label={`تقييم خيار ${i + 1}`} />
              <b className="tnum w-6 text-center font-display text-[20px]">{o.score ?? "؟"}</b>
            </div>
          </div>
        ))}
        {options.length < 6 && <button type="button" className="btn btn-text btn-sm" onClick={() => setOptions((o) => [...o, { text: "", score: null }])}>+ خيار</button>}
        {rule.verdict !== "UNSCORED" && (
          <p className={`rounded-xl px-3 py-2 text-[14px] ${rule.verdict === "YES" ? "bg-accent-soft text-success" : "bg-gold-soft text-warning"}`}>
            {rule.verdict === "YES" ? `«${rule.best!.text}» أكيد نعم (${rule.best!.score}/10).` : `ولا خيار «أكيد نعم». قاعدة 90%: إذا مش 9 أو أكتر فهو لا، أو دوّر على خيار تالت (Essentialism).`}
          </p>
        )}
      </fieldset>

      <label className="block"><span className="mb-1 block font-bold">Premortem <bdi dir="ltr" className="font-normal text-muted">(Kahneman)</bdi></span><textarea rows={2} value={premortem} onChange={(e) => setPremortem(e.target.value)} placeholder="بعد سنة طلع القرار فاشل. شو صار؟" /></label>
      <label className="block"><span className="mb-1 block font-bold">الرؤية من برّا</span><textarea rows={2} value={outsideView} onChange={(e) => setOutsideView(e.target.value)} placeholder="شو بيصير عادةً مع الي بيعملوا نفس الشي؟" /></label>

      <fieldset>
        <legend className="mb-1 font-bold">فحص التحيّزات</legend>
        <ul className="space-y-1.5">
          {BIASES.map((b) => (
            <li key={b.key}>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" className="mt-1.5 h-5 w-5 accent-[var(--color-accent)]" checked={biases.includes(b.key)} onChange={(e) => setBiases((x) => (e.target.checked ? [...x, b.key] : x.filter((k) => k !== b.key)))} />
                <span><b className="text-[14.5px]">{b.label}:</b> <span className="text-[14px] text-muted">{b.q}</span></span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {connected && (
        <div className="space-y-2">
          <button type="button" className="btn btn-secondary w-full" onClick={ask} aria-busy={thinking} disabled={!title.trim()}><Icon name="Sparkles" size={18} /> {thinking ? "المستشار عم يفكّر…" : "حلّلها مع المستشار"}</button>
          {advice && <p className="card whitespace-pre-wrap p-3 text-[14.5px] leading-relaxed">{advice}</p>}
        </div>
      )}

      <label className="block"><span className="mb-1 block font-bold">شو قرّرت؟</span><input value={chosen} onChange={(e) => setChosen(e.target.value)} placeholder="فاضي = لسا ما قرّرت" /></label>
      {chosen.trim() && <label className="block"><span className="mb-1 block font-bold">ليش؟</span><textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></label>}
      <label className="block"><span className="mb-1 block font-bold">إيمتى تراجع النتيجة؟</span><input type="date" value={reviewAt} onChange={(e) => setReviewAt(e.target.value)} /></label>
      {d?.status !== "OPEN" && d && (
        <>
          <label className="block"><span className="mb-1 block font-bold">شو صار فعلاً؟</span><textarea rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} /></label>
          <label className="block"><span className="mb-1 block font-bold">الدرس (ألم ← سبب ← مبدأ)</span><textarea rows={2} value={lesson} onChange={(e) => setLesson(e.target.value)} /></label>
        </>
      )}

      {gaps.length > 0 && (
        <div className="rounded-xl bg-surface-2 px-3 py-2 text-[13.5px] text-muted">
          <b className="text-ink">ناقص:</b>
          <ul className="list-inside list-disc">{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      )}
      {error && <p className="text-[14px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" aria-busy={pending}>احفظ</button>
        {d && <button type="button" className="btn btn-danger" onClick={() => start(async () => { await A.deleteDecision(d.id); onDone(); })}>احذف</button>}
      </div>
    </form>
  );
}
