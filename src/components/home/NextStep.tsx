"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Dot } from "@/components/ui/Dot";
import * as A from "@/app/actions";

/** بطاقة «الخطوة الجاية»: البطاقة الوحيدة الملوّنة بالرئيسية (Von Restorff). دائرة وحدة = خلصت (Microinteractions) */
export function NextStep({
  task,
  weekHref,
  label = "الخطوة الجاية",
}: {
  label?: string;
  task: { id: string; title: string; goal: string | null; pillar: string | null; color: string | null; okrRank: number | null } | null;
  weekHref: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (!task)
    return (
      <section className="card p-5 text-center">
        <p className="font-bold">ما في شي مفتوح هالأسبوع</p>
        <p className="mb-3 text-[15px] text-muted">إما خلّصت كل شي (يا سلام)، أو لسا ما خطّطت.</p>
        <Link href={weekHref} className="btn btn-secondary">خطّط أسبوعك</Link>
      </section>
    );
  return (
    <section className="rise rounded-2xl bg-accent-soft p-4" aria-labelledby="next-h">
      <h2 id="next-h" className="mb-2 text-[13px] font-bold text-accent">{label}</h2>
      <div className="flex items-start gap-3">
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
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition duration-200 active:scale-90 ${done ? "border-success bg-success text-card" : "border-accent bg-card"}`}
        >
          {done && <span className="text-lg">✓</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[19px] font-extrabold leading-snug transition ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[15px] text-muted">
            {task.pillar ? (
              <>
                <Dot color={task.color} /> {task.pillar}
              </>
            ) : (
              "روتين"
            )}
            {task.okrRank && <span className="badge bg-card font-bold text-accent">أولوية {task.okrRank}</span>}
          </p>
        </div>
      </div>
    </section>
  );
}
