"use client";
import { useOptimistic, useState, useTransition } from "react";
import { EditableText } from "@/components/ui/EditableText";
import { Icon, HABIT_ICONS } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import * as A from "@/app/today/actions";
import type { TodayView } from "@/modules/daily/server";

/** نيّة اليوم (الرواقيين: نية صبح بجملة). بتنكتب بكبسة وبتنحفظ لحالها */
export function IntentCard({ intent }: { intent: string | null }) {
  return (
    <section aria-labelledby="intent-h">
      <h2 id="intent-h" className="eyebrow mb-1">نيّة اليوم</h2>
      <EditableText
        label="نيّة اليوم"
        value={intent}
        placeholder="شو الشي الوحيد الي إذا عملته اليوم، بتكون مبسوط؟"
        maxLength={140}
        multiline={false}
        onSave={(v) => A.saveIntent(v)}
        className="font-display text-[23px] leading-[1.55]"
      />
    </section>
  );
}

const LEVELS = [
  { v: 1, l: "تعبان" },
  { v: 2, l: "واطية" },
  { v: 3, l: "عادي" },
  { v: 4, l: "منيح" },
  { v: 5, l: "نار" },
];

/** طاقتك هلّق: كبسة وحدة. من هون بينبني منحنى طاقتك ونمطها مع الوقت (مذكرة الطاقة، DYL) */
export function EnergyPicker({ energy }: { energy: number | null }) {
  const [v, setV] = useOptimistic(energy);
  const [, start] = useTransition();
  return (
    <div role="radiogroup" aria-label="طاقتك هلّق" className="grid grid-cols-5 gap-1 rounded-2xl bg-surface-2 p-1">
      {LEVELS.map((x) => (
        <button
          key={x.v}
          type="button"
          role="radio"
          aria-checked={v === x.v}
          onClick={() => start(async () => { setV(x.v); await A.saveFeeling("energy", x.v); })}
          className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-[12.5px] transition ${v === x.v ? "bg-card font-bold text-accent shadow-[var(--shadow-sm)] dark:text-gold" : "text-muted"}`}
        >
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={`block h-2.5 w-1 rounded-full ${i < x.v ? "bg-current" : "bg-line"}`} />
            ))}
          </span>
          {x.l}
        </button>
      ))}
    </div>
  );
}

type Habit = TodayView["habits"][number];

/** العادات (Atomic Habits): دوائر كبيرة بكبسة، سلسلة الأيام، و«ما تفوّت مرتين» */
export function Habits({ habits, pillars }: { habits: Habit[]; pillars: { id: string; name: string }[] }) {
  const [list, patch] = useOptimistic(habits, (cur: Habit[], p: { id: string; done: boolean }) =>
    cur.map((h) => (h.id === p.id ? { ...h, done: p.done, streak: h.streak + (p.done ? 1 : -1) } : h)),
  );
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const doneCount = list.filter((h) => h.done).length;
  const risk = list.find((h) => h.risk && !h.done);

  return (
    <section className="card p-4" aria-labelledby="hab-h">
      <div className="flex items-baseline justify-between">
        <h2 id="hab-h" className="font-display text-[23px] font-bold">عاداتك</h2>
        <span className="tnum text-[13px] text-muted"><bdi>{doneCount}</bdi> من <bdi>{list.length}</bdi></span>
      </div>
      {list.length === 0 && <p className="mt-2 text-[15px] text-muted">ما في عادات لسا. ابدأ بوحدة صغيرة كتير (قاعدة الدقيقتين).</p>}
      <ul className="mt-3 grid grid-cols-4 gap-2">
        {list.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              aria-pressed={h.done}
              onClick={() =>
                start(async () => {
                  patch({ id: h.id, done: !h.done });
                  if (!h.done && "vibrate" in navigator) navigator.vibrate?.(10);
                  await A.toggleHabit(h.id, !h.done);
                })
              }
              className="flex w-full flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full border transition duration-200 ${
                  h.done ? "border-accent bg-accent text-on-accent dark:border-transparent dark:[background:var(--gold-metal)]" : "border-gold-deco bg-surface-2 text-gold"
                }`}
              >
                <Icon name={h.done ? "Check" : h.icon} size={22} strokeWidth={h.done ? 2.6 : 1.8} />
              </span>
              <span className="text-[12.5px] leading-tight">{h.name}</span>
              <span className="tnum text-[11.5px] text-muted">{h.streak > 0 ? `${h.streak} يوم` : " "}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => setAdding(true)} className="flex w-full flex-col items-center gap-1.5 text-muted" aria-label="عادة جديدة">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-field"><Icon name="Plus" /></span>
            <span className="text-[12.5px]">عادة</span>
          </button>
        </li>
      </ul>
      {risk && <p className="mt-3 rounded-xl bg-gold-soft px-3 py-2 text-[14px] text-gold">فوّت «{risk.name}» مبارح. اليوم لا تفوّتها مرتين، ولو دقيقتين.</p>}
      <Sheet open={adding} onClose={() => setAdding(false)} title="عادة جديدة">
        <NewHabit pillars={pillars} onDone={() => setAdding(false)} />
      </Sheet>
    </section>
  );
}

function NewHabit({ pillars, onDone }: { pillars: { id: string; name: string }[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(HABIT_ICONS[0]);
  const [pillar, setPillar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await A.newHabit(name, icon, pillar || null);
          if (r.ok) onDone();
          else setError(r.message);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">شو العادة؟</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="صغيرة كتير: «مشي 10 دقائق»" autoFocus />
        <span className="text-[13px] text-muted">نية تنفيذ: «بعد ما ___، رح ___» بتخليها تمشي (Atomic Habits)</span>
      </label>
      <div>
        <span className="mb-1 block text-[15px] font-bold">الأيقونة</span>
        <div className="grid grid-cols-5 gap-2">
          {HABIT_ICONS.map((i) => (
            <button key={i} type="button" aria-pressed={icon === i} aria-label={i} onClick={() => setIcon(i)} className={`flex h-12 items-center justify-center rounded-xl border ${icon === i ? "border-accent bg-accent-soft text-accent dark:text-gold" : "border-line text-muted"}`}>
              <Icon name={i} />
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">بتخدم أي محور؟</span>
        <select value={pillar} onChange={(e) => setPillar(e.target.value)}>
          <option value="">بدون</option>
          {pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {error && <p className="text-[15px] text-danger">{error}</p>}
      <button className="btn btn-primary w-full" aria-busy={pending}>أضف العادة</button>
    </form>
  );
}

/** مراجعة المسا (الرواقيين، Meditations): شو صار، وشو كان بإيدي */
export function EveningCard({ evening }: { evening: string | null }) {
  return (
    <section className="card p-4" aria-labelledby="eve-h">
      <h2 id="eve-h" className="font-display text-[23px] font-bold">مراجعة المسا</h2>
      <p className="mb-2 text-[14px] text-muted">شو صار اليوم؟ شو كان بإيدك، وشو مش بإيدك؟ شو بتعمل غير بكرة؟</p>
      <EditableText label="مراجعة المسا" value={evening} placeholder="دقيقتين بس…" onSave={(v) => A.saveEvening(v)} className="leading-relaxed" />
    </section>
  );
}
