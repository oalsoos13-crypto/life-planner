"use client";
import { useState, useTransition } from "react";
import { createTask } from "@/app/actions";
import type { GoalOption } from "@/lib/goals";
import { GoalSelect } from "./GoalSelect";
import { useI18n } from "./I18n";

export function AddTaskForm({ weekStart, goals, autoFocus }: { weekStart: string; goals: GoalOption[]; autoFocus?: boolean }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    start(async () => {
      await createTask({ weekStart, title, goalId: goalId || null, repeat });
      setTitle("");
      setGoalId("");
      setRepeat(false);
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.taskTitle} autoFocus={autoFocus} />
      <GoalSelect goals={goals} value={goalId} onChange={setGoalId} />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          {t.repeatWeekly}
        </label>
        <button className="btn btn-primary" disabled={pending || !title.trim()}>+ {t.add}</button>
      </div>
    </form>
  );
}
