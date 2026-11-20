"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import * as A from "@/app/actions";
import type { GoalOption } from "@/lib/goals";
import { Sheet } from "@/components/ui/Sheet";
import { GoalSelect } from "@/components/GoalSelect";
import { WIP_LIMIT, groupWeek } from "@/modules/execution";
import { TaskRow, type TaskView } from "./TaskRow";

const LAST_GOAL = "lp.lastGoal";

/**
 * قائمة الأسبوع بمجموعات (ماشية ← لسا ← خلصت مطوية)، تراجع 5 ثواني بدل رسائل تأكيد (DOET، About Face)،
 * وزر عائم بيفتح ورقة الإضافة (دليل الواجهات §10.2).
 */
export function WeekList({ tasks, goals, editable, weekStart, autoAdd }: { tasks: TaskView[]; goals: GoalOption[]; editable: boolean; weekStart: string; autoAdd: boolean }) {
  const g = groupWeek(tasks);
  const [undo, setUndo] = useState<TaskView | null>(null);
  const [adding, setAdding] = useState(autoAdd && editable);
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wipLinked = g.inProgress.filter((t) => t.goalId).length;

  const completed = (t: TaskView) => {
    setUndo(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), 5000);
  };

  const row = (t: TaskView) => <TaskRow key={t.id} task={t} goals={goals} editable={editable} onCompleted={completed} />;

  return (
    <>
      {tasks.length === 0 && (
        <div className="card p-6 text-center">
          <p className="font-bold">ما في مهام بهالأسبوع لسا</p>
          <p className="text-[15px] text-muted">ابدأ بالحجر الكبير: شو أهم شي للأولوية 1؟</p>
        </div>
      )}

      {g.inProgress.length > 0 && (
        <section className="card px-4 py-2" aria-label="ماشية">
          <h2 className="pt-2 text-[15px] font-bold text-info">
            ◐ ماشية <span className="tnum font-medium text-muted">({wipLinked} من {WIP_LIMIT})</span>
          </h2>
          <ul className="divide-y divide-line">{g.inProgress.map(row)}</ul>
          {wipLinked > WIP_LIMIT && <p className="pb-2 text-[15px] text-warning">عندك {wipLinked} ماشيين. خلّص وحدة أول؟ (حد الشغل المفتوح)</p>}
        </section>
      )}

      {g.todo.length > 0 && (
        <section className="card px-4 py-2" aria-label="لسا">
          <h2 className="pt-2 text-[15px] font-bold text-muted">لسا ({g.todo.length})</h2>
          <ul className="divide-y divide-line">{g.todo.map(row)}</ul>
          {editable && <p className="pb-2 text-[13px] text-muted">كبسة على الدائرة = خلصت · ضغطة مطوّلة = ماشية</p>}
        </section>
      )}

      {g.done.length > 0 && (
        <details className="card group px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-bold text-success">
            <span>✓ خلصت ({g.done.length})</span>
            <span className="text-muted transition group-open:rotate-180" aria-hidden>⌄</span>
          </summary>
          <ul className="mt-1 divide-y divide-line">{g.done.map(row)}</ul>
        </details>
      )}

      {g.cancelled.length > 0 && (
        <details className="card group px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-bold text-muted">
            <span>متروكة ({g.cancelled.length})</span>
            <span className="transition group-open:rotate-180" aria-hidden>⌄</span>
          </summary>
          <ul className="mt-1 divide-y divide-line">{g.cancelled.map(row)}</ul>
        </details>
      )}

      {undo && (
        <div role="status" className="rise fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-bg shadow-[var(--shadow-lg)]">
          <span className="min-w-0 truncate">✓ خلصت «{undo.title}»</span>
          <button
            type="button"
            className="shrink-0 font-bold text-accent-soft"
            onClick={() => {
              const t = undo;
              setUndo(null);
              start(async () => void (await A.setStatus(t.id, "NOT_STARTED")));
            }}
          >
            تراجع
          </button>
        </div>
      )}

      {editable && !undo && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="أضف مهمة"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] end-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-on-accent shadow-[var(--shadow-md)] transition active:scale-95"
        >
          +
        </button>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="مهمة جديدة">
        <AddTask weekStart={weekStart} goals={goals} onDone={() => setAdding(false)} />
      </Sheet>
    </>
  );
}

function AddTask({ weekStart, goals, onDone }: { weekStart: string; goals: GoalOption[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  // المحور بيتذكّر آخر اختيار (About Face: قيم افتراضية ذكية)
  useEffect(() => {
    try {
      const v = localStorage.getItem(LAST_GOAL);
      if (v && goals.some((g) => g.id === v)) setGoalId(v);
    } catch {}
  }, [goals]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return setError(true);
        start(async () => {
          await A.createTask({ weekStart, title, goalId: goalId || null, repeat });
          try {
            localStorage.setItem(LAST_GOAL, goalId);
          } catch {}
          setTitle("");
          setRepeat(false);
          onDone();
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">شو المهمة؟</span>
        <input autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setError(false); }} placeholder="فعل + شي: «اكتب وصف صفحة المتجر»" aria-invalid={error} />
        {error && <span className="text-[15px] text-danger">اكتب المهمة أول</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">بتخدم أي هدف؟</span>
        <GoalSelect goals={goals} value={goalId} onChange={setGoalId} />
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
        <span>تتكرر كل أسبوع</span>
      </label>
      <button className="btn btn-primary w-full" aria-busy={pending}>{pending ? "عم يضيف…" : "أضف المهمة"}</button>
    </form>
  );
}
