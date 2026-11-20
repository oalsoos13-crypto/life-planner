"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import * as A from "@/app/actions";
import type { GoalOption } from "@/lib/goals";
import { Dot } from "@/components/ui/Dot";
import { Sheet } from "@/components/ui/Sheet";
import { holdStatus, tapStatus } from "@/modules/execution";
import { TaskDetails } from "./TaskDetails";

export type TaskView = {
  id: string;
  title: string;
  goalId: string | null;
  goalTitle: string | null;
  pillarName: string | null;
  color: string | null;
  okrRank: number | null;
  notes: string | null;
  progress: number | null;
  imageData: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
  cancelled: boolean;
  cancelReason: string | null;
  stuck: boolean;
  stuckNote: string | null;
  carryCount: number;
  isCarried: boolean;
  repeating: boolean;
  overdue: boolean;
  steps: { id: string; title: string; done: boolean }[];
};

const HOLD_MS = 450;

/**
 * سطر مهمة 64px بدل بطاقة فيها 3 أزرار (دليل الواجهات §9.2):
 * دائرة وحدة: كبسة = خلصت، ضغطة مطوّلة = ماشية (Laws of UX: هيك وفيتس؛ Microinteractions).
 * كبسة على العنوان = التفاصيل بورقة سفلية.
 */
export function TaskRow({
  task: serverTask,
  goals,
  editable,
  onCompleted,
}: {
  task: TaskView;
  goals: GoalOption[];
  editable: boolean;
  onCompleted: (t: TaskView) => void;
}) {
  const [task, patch] = useOptimistic(serverTask, (cur: TaskView, p: Partial<TaskView>) => ({ ...cur, ...p }));
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const setStatus = (s: TaskView["status"]) =>
    start(async () => {
      patch(s === "DONE" ? { status: s, stuck: false } : { status: s });
      if (s === "DONE") {
        if ("vibrate" in navigator) navigator.vibrate?.(10);
        onCompleted(task);
      }
      await A.setStatus(task.id, s);
    });

  const down = () => {
    if (!editable || task.cancelled) return;
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      if ("vibrate" in navigator) navigator.vibrate?.(15);
      setStatus(holdStatus(task.status));
    }, HOLD_MS);
  };
  const up = () => timer.current && clearTimeout(timer.current);

  const doneSteps = task.steps.filter((s) => s.done).length;
  const muted = task.status === "DONE" || task.cancelled;

  return (
    <li className="flex min-h-16 items-start gap-3 py-2">
      <button
        type="button"
        disabled={!editable || task.cancelled}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (held.current) return;
          setStatus(tapStatus(task.status));
        }}
        aria-label={task.status === "DONE" ? `رجّع «${task.title}»` : `خلّص «${task.title}» (اضغط مطوّل: ماشية)`}
        className="-m-1.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
      >
        <span
          className={`relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-200 ${
            task.status === "DONE" ? "border-success bg-success" : task.status === "IN_PROGRESS" ? "border-info" : "border-field"
          }`}
        >
          {task.status === "IN_PROGRESS" && <span className="absolute inset-y-0 start-0 w-1/2 bg-info" />}
          {task.status === "DONE" && <span className="text-[15px] font-extrabold text-card">✓</span>}
        </span>
      </button>

      <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 py-1 text-start">
        <span className={`line-clamp-2 font-bold leading-snug ${muted ? "text-muted line-through" : ""}`}>{task.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] text-muted">
          {task.goalTitle ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Dot color={muted ? null : task.color} />
              <span className="truncate">{task.okrRank ? `أولوية ${task.okrRank}` : task.pillarName}</span>
            </span>
          ) : (
            <span>روتين</span>
          )}
          {task.repeating && <span aria-label="متكررة">↻</span>}
          {task.steps.length > 0 && (
            <span aria-label={`${doneSteps} من ${task.steps.length} خطوات`} className="tracking-tight">
              {task.steps.map((s) => (s.done ? "●" : "○")).join("")}
            </span>
          )}
          {task.isCarried && <span>منقولة{task.carryCount > 1 ? ` ×${task.carryCount}` : ""}</span>}
          {task.stuck && !muted && <span className="text-warning">⚠ عالقة</span>}
          {task.overdue && !muted && <span className="text-warning">⏰ متأخرة</span>}
          {task.cancelled && <span>ملغاة</span>}
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={task.title}>
        <TaskDetails task={task} goals={goals} editable={editable} onStatus={setStatus} onClose={() => setOpen(false)} />
      </Sheet>
    </li>
  );
}
