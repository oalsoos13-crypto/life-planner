"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Planet, sparklePath } from "@/components/space/Planet";
import * as A from "@/app/actions";

/** «الخطوة الجاية»: البطاقة الوحيدة الغامقة بالشاشة (Von Restorff). دائرة ذهب وحدة = خلصت (Microinteractions) */
export function NextStep({
  task,
  weekHref,
  label = "الخطوة الجاية",
  when,
}: {
  label?: string;
  when?: string | null;
  task: { id: string; title: string; goal: string | null; pillar: string | null; color: string | null; okrRank: number | null; steps?: { done: number; total: number } } | null;
  weekHref: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (!task)
    return (
      <section className="card p-5 text-center">
        <p className="font-display text-[21px] font-bold">ما في شي مفتوح هالأسبوع</p>
        <p className="mb-3 text-[15px] text-muted">إما خلّصت كل شي (يا سلام)، أو لسا ما خطّطت.</p>
        <Link href={weekHref} className="btn btn-secondary">خطّط أسبوعك</Link>
      </section>
    );
  const meta = [task.steps && task.steps.total > 0 ? `${task.steps.done} من ${task.steps.total} خطوات` : null, task.pillar ?? "روتين", when].filter(Boolean).join(" · ");
  return (
    <section className="hero-card rise" aria-labelledby="next-h">
      {/* مسار الصاروخ لنجمة الهدف، وكوكب الأرض تحت */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 350 200" preserveAspectRatio="none" aria-hidden>
        <path d="M 340 196 C 250 190, 120 150, 40 26" fill="none" stroke="rgb(185 243 255 / .45)" strokeWidth="1.5" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg className="pointer-events-none absolute left-5 top-1.5" width="40" height="40" viewBox="-20 -20 40 40" aria-hidden>
        <circle r="16" fill="#5ec8ff" opacity=".18" />
        <path d={sparklePath(0, 0, 11)} fill="#b9f3ff" />
      </svg>
      <div className="pointer-events-none absolute -bottom-16 -left-8">
        <Planet id="next-earth" r={48} light="#9fe7ff" base="#2c6fd6" band="#dff" />
      </div>
      <h2 id="next-h" className="eyebrow relative z-[1]">
        {label}
        {task.okrRank ? ` · أولوية ${task.okrRank}` : ""}
      </h2>
      <p className={`relative z-[1] mt-2 font-display text-[25px] font-bold leading-[1.45] transition ${done ? "line-through opacity-60" : ""}`}>{task.title}</p>
      <div className="relative z-[1] mt-4 flex items-end justify-between gap-3">
        <p className="meta min-w-0 text-[13px] leading-relaxed">
          {meta}
          {task.goal && <><br />بتخدم: {task.goal}</>}
        </p>
        <button
          type="button"
          aria-label={done ? "خلصت" : `علّم «${task.title}» خلصت`}
          aria-pressed={done}
          disabled={pending}
          onClick={() =>
            start(async () => {
              setDone(true);
              if ("vibrate" in navigator) navigator.vibrate?.(10);
              await A.setStatus(task.id, "DONE");
            })
          }
          className="gold-fill flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full shadow-[0_10px_24px_rgb(0_0_0/0.28)] transition active:scale-90"
        >
          <Icon name="Check" size={28} strokeWidth={done ? 3 : 2.4} />
        </button>
      </div>
    </section>
  );
}
