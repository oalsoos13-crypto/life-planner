"use client";
import { useOptimistic, useState, useTransition } from "react";
import { EditableText } from "@/components/ui/EditableText";
import { Icon, HABIT_ICONS } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Galaxy, sparklePath } from "@/components/space/Planet";
import * as A from "@/app/today/actions";
import type { TodayView } from "@/modules/daily/server";

/** نيّة اليوم (الرواقيين: نية صبح بجملة). بتنكتب بكبسة وبتنحفظ لحالها */
export function IntentCard({ intent }: { intent: string | null }) {
  return (
    <section className="card relative overflow-hidden p-4" aria-labelledby="intent-h">
      <Galaxy id="intent-gx" className="pointer-events-none absolute -top-6 -left-5 opacity-40" />
      <h2 id="intent-h" className="eyebrow relative mb-1">نيّة اليوم</h2>
      <EditableText
        label="نيّة اليوم"
        value={intent}
        placeholder="شو الشي الوحيد الي إذا عملته اليوم، بتكون مبسوط؟"
        maxLength={140}
        multiline={false}
        onSave={(v) => A.saveIntent(v)}
        className="relative font-display text-[22px] leading-[1.55]"
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
          className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-[12.5px] transition ${v === x.v ? "bg-card font-bold text-accent shadow-[var(--shadow-sm)] dark:text-[#b9f3ff]" : "text-muted"}`}
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

// برج العادات: كل عادة نجمة بمكان ثابت (ارتفاع متغيّر بالصف) والخط بين نجمتين بيضوي لما الثنتين يخلصوا
const ROW_H = 132;
const OFFS = [22, 0, 34, 8];
const COLS = 4;

/** العادات (Atomic Habits) كبرج نجوم: كبسة = النجمة بتضوي، سلسلة الأيام، و«ما تفوّت مرتين» */
export function Habits({ habits, pillars }: { habits: Habit[]; pillars: { id: string; name: string }[] }) {
  const [list, patch] = useOptimistic(habits, (cur: Habit[], p: { id: string; done: boolean }) =>
    cur.map((h) => (h.id === p.id ? { ...h, done: p.done, streak: Math.max(0, h.streak + (p.done ? 1 : -1)) } : h)),
  );
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const doneCount = list.filter((h) => h.done).length;
  const risk = list.find((h) => h.risk && !h.done);
  const cells = list.length;
  const rows = Math.ceil(cells / COLS);
  // مركز كل نجمة بإحداثيات 0..100 أفقياً (يمين لشمال) وبالبكسل عمودياً
  const pos = (i: number) => ({ x: 100 - ((i % COLS) + 0.5) * (100 / COLS), y: Math.floor(i / COLS) * ROW_H + OFFS[i % COLS] + 26 });

  return (
    <section className="card relative overflow-hidden p-4" aria-labelledby="hab-h">
      <div className="flex items-baseline justify-between">
        <h2 id="hab-h" className="font-display text-[23px] font-bold">برج عاداتك</h2>
        <span className="flex items-center gap-2">
          <span className="tnum text-[13px] text-muted"><bdi>{doneCount}</bdi> من <bdi>{list.length}</bdi> نجوم</span>
          <button type="button" onClick={() => setAdding(true)} className="btn btn-sm btn-text -me-2" aria-label="عادة جديدة"><Icon name="Plus" size={16} /> نجمة</button>
        </span>
      </div>
      {list.length === 0 && <p className="mt-2 text-[15px] text-muted">ما في عادات لسا. ابدأ بوحدة صغيرة كتير (قاعدة الدقيقتين)، وكل وحدة رح تصير نجمة.</p>}
      <div className="relative mt-3" style={{ height: rows * ROW_H }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${rows * ROW_H}`} preserveAspectRatio="none" aria-hidden>
          {list.slice(0, -1).map((h, i) => {
            if (Math.floor(i / COLS) !== Math.floor((i + 1) / COLS)) return null;
            const a = pos(i);
            const b = pos(i + 1);
            const lit = h.done && list[i + 1].done;
            return <line key={h.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lit ? "var(--color-gold)" : "var(--color-field)"} strokeOpacity={lit ? 1 : 0.6} strokeWidth={lit ? 1.6 : 1} strokeDasharray={lit ? undefined : "3 5"} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <ul className="relative grid grid-cols-4">
          {list.map((h, i) => (
            <li key={h.id} style={{ height: ROW_H, paddingTop: OFFS[i % COLS] }}>
              <button
                type="button"
                aria-pressed={h.done}
                aria-label={`${h.name}${h.done ? "، خلصت" : ""}`}
                onClick={() =>
                  start(async () => {
                    patch({ id: h.id, done: !h.done });
                    if (!h.done && "vibrate" in navigator) navigator.vibrate?.(10);
                    await A.toggleHabit(h.id, !h.done);
                  })
                }
                className="flex w-full flex-col items-center gap-1"
              >
                <span className="relative flex h-[52px] w-[52px] items-center justify-center">
                  {h.done ? (
                    <svg viewBox="-26 -26 52 52" className="star-on h-[52px] w-[52px]" aria-hidden>
                      <circle r="18" fill="var(--color-gold-deco)" opacity=".35" style={{ filter: "blur(6px)" }} />
                      <path d={sparklePath(0, 0, 15)} fill="var(--star)" />
                      <circle r="3" fill="var(--star)" />
                    </svg>
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-field/70 text-muted">
                      <Icon name={h.icon} size={18} strokeWidth={1.6} />
                    </span>
                  )}
                </span>
                <span className={`text-[12.5px] leading-tight ${h.done ? "font-bold" : "text-muted"}`}>{h.name}</span>
                <span className="tnum text-[11.5px] text-gold">{h.streak > 0 ? `${h.streak} يوم` : "\u00a0"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {risk ? (
        <p className="mt-1 rounded-xl bg-gold-soft px-3 py-2 text-[14px] text-gold">فوّت «{risk.name}» مبارح. اليوم لا تفوّتها مرتين، ولو دقيقتين.</p>
      ) : (
        list.length > 0 && <p className="mt-1 text-[12.5px] text-muted">كل ما تكمّل عادة، نجمتها بتضوي وبينرسم خطها. يوم كامل = برج كامل ✦</p>
      )}
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
            <button key={i} type="button" aria-pressed={icon === i} aria-label={i} onClick={() => setIcon(i)} className={`flex h-12 items-center justify-center rounded-xl border ${icon === i ? "border-accent bg-accent-soft text-accent dark:text-[#b9f3ff]" : "border-line text-muted"}`}>
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
