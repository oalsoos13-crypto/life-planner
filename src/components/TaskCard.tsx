"use client";
import { useOptimistic, useState, useTransition } from "react";
import * as A from "@/app/actions";
import type { GoalOption } from "@/lib/goals";
import { GoalSelect } from "./GoalSelect";
import { useI18n } from "./I18n";

export type TaskView = {
  id: string;
  title: string;
  goalId: string | null;
  goalTitle: string | null;
  pillarName: string | null;
  color: string | null;
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

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "DONE"] as const;

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const max = 900;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.75);
}

export function TaskCard({ task: serverTask, goals, editable }: { task: TaskView; goals: GoalOption[]; editable: boolean }) {
  const { t } = useI18n();
  // تحديث فوري على الشاشة لحد ما يرجع الرد من السيرفر
  const [task, patch] = useOptimistic(serverTask, (cur: TaskView, p: Partial<TaskView>) => ({ ...cur, ...p }));
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"none" | "cancel" | "stuck">("none");
  const [reason, setReason] = useState("");
  const [stuckNote, setStuckNote] = useState(task.stuckNote ?? "");
  const [newStep, setNewStep] = useState("");
  const run = (fn: () => Promise<unknown>) => start(async () => void (await fn()));
  const ro = !editable || pending;
  const doneSteps = task.steps.filter((s) => s.done).length;

  const border = task.cancelled
    ? "opacity-60"
    : task.stuck
      ? "ring-2 ring-orange-400/70"
      : task.overdue
        ? "ring-2 ring-red-400/70"
        : "";

  return (
    <div className={`card overflow-hidden ${border}`}>
      <div className="flex gap-3 p-4">
        <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: task.color ?? "var(--color-line)" }} />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpen(!open)} className="block w-full text-start">
            <p className={`font-bold leading-snug ${task.status === "DONE" || task.cancelled ? "line-through text-muted" : ""}`}>{task.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted">{task.goalTitle ?? t.routine}</span>
              {task.overdue && <Badge cls="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">{t.overdue}</Badge>}
              {task.stuck && <Badge cls="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">{t.stuck}</Badge>}
              {task.cancelled && <Badge cls="bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300">{t.cancelled}</Badge>}
              {task.isCarried && <Badge cls="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">{t.carried}{task.carryCount > 1 ? ` ×${task.carryCount}` : ""}</Badge>}
              {task.repeating && <Badge cls="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">↻ {t.repeating}</Badge>}
              {task.steps.length > 0 && <span className="text-muted">✓ {doneSteps}/{task.steps.length}</span>}
              {task.progress != null && task.status !== "DONE" && <bdi dir="ltr" className="text-muted">{task.progress}%</bdi>}
            </div>
            {task.stuck && task.stuckNote && <p className="mt-1.5 text-sm text-orange-700 dark:text-orange-300">⚠ {task.stuckNote}</p>}
            {task.cancelled && task.cancelReason && <p className="mt-1.5 text-sm text-muted">— {task.cancelReason}</p>}
          </button>

          {!task.cancelled && (
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-bg p-1 text-xs">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={ro}
                  onClick={() => run(() => { patch(s === "DONE" ? { status: s, stuck: false, stuckNote: null } : { status: s }); return A.setStatus(task.id, s); })}
                  className={`rounded-lg py-2 font-semibold transition ${
                    task.status === s
                      ? s === "DONE"
                        ? "bg-emerald-600 text-white"
                        : s === "IN_PROGRESS"
                          ? "bg-sky-600 text-white"
                          : "bg-card shadow-sm"
                      : "text-muted"
                  }`}
                >
                  {t[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line p-4 text-sm">
          {editable && (
            <input
              defaultValue={task.title}
              onBlur={(e) => e.target.value !== task.title && run(() => A.updateTask(task.id, { title: e.target.value }))}
            />
          )}
          <label className="block space-y-1.5">
            <span className="text-muted">{t.linkGoal}</span>
            <GoalSelect goals={goals} value={task.goalId ?? ""} disabled={ro} onChange={(v) => run(() => A.updateTask(task.id, { goalId: v || null }))} />
          </label>

          {/* الخطوات */}
          <div className="space-y-2">
            <p className="text-muted">{t.steps}</p>
            {task.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <input type="checkbox" className="h-5 w-5" checked={s.done} disabled={ro} onChange={(e) => { const v = e.target.checked; run(() => { patch({ steps: task.steps.map((x) => (x.id === s.id ? { ...x, done: v } : x)) }); return A.toggleStep(s.id, v); }); }} />
                <span className={`flex-1 ${s.done ? "line-through text-muted" : ""}`}>{s.title}</span>
                {editable && (
                  <button type="button" className="px-2 text-muted" onClick={() => run(() => A.deleteStep(s.id))} aria-label={t.delete}>×</button>
                )}
              </div>
            ))}
            {editable && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = newStep;
                  setNewStep("");
                  run(() => A.addStep(task.id, v));
                }}
              >
                <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder={t.addStep} />
                <button className="btn" disabled={!newStep.trim()}>+</button>
              </form>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-muted">{t.notes}</span>
            <textarea
              rows={3}
              defaultValue={task.notes ?? ""}
              disabled={!editable}
              onBlur={(e) => e.target.value !== (task.notes ?? "") && run(() => A.updateTask(task.id, { notes: e.target.value || null }))}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-muted">{t.progress}: <bdi dir="ltr">{task.progress ?? 0}%</bdi></span>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              className="w-full accent-teal-600"
              defaultValue={task.progress ?? 0}
              disabled={ro}
              onPointerUp={(e) => run(() => A.updateTask(task.id, { progress: Number((e.target as HTMLInputElement).value) }))}
              onKeyUp={(e) => run(() => A.updateTask(task.id, { progress: Number((e.target as HTMLInputElement).value) }))}
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-muted">{t.image}</span>
            {task.imageData && <img src={task.imageData} alt="" className="max-h-64 rounded-xl" />}
            {editable && (
              <div className="flex flex-wrap gap-2">
                <label className="btn cursor-pointer">
                  📷 {t.image}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const data = await compressImage(f);
                      run(() => A.updateTask(task.id, { imageData: data }));
                    }}
                  />
                </label>
                {task.imageData && (
                  <button type="button" className="btn" onClick={() => run(() => A.updateTask(task.id, { imageData: null }))}>{t.removeImage}</button>
                )}
              </div>
            )}
          </div>

          {editable && (
            <>
              {mode === "stuck" && (
                <div className="space-y-2 rounded-xl bg-orange-50 p-3 dark:bg-orange-950/40">
                  <input value={stuckNote} onChange={(e) => setStuckNote(e.target.value)} placeholder={t.stuckPlaceholder} autoFocus />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary" onClick={() => { setMode("none"); run(() => A.setStuck(task.id, true, stuckNote)); }}>{t.save}</button>
                    <button type="button" className="btn" onClick={() => setMode("none")}>{t.cancel}</button>
                  </div>
                </div>
              )}
              {mode === "cancel" && (
                <div className="space-y-2 rounded-xl bg-stone-100 p-3 dark:bg-stone-900">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.cancelReason} autoFocus />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary" disabled={!reason.trim()} onClick={() => { setMode("none"); run(() => A.cancelTask(task.id, reason)); }}>{t.cancelTask}</button>
                    <button type="button" className="btn" onClick={() => setMode("none")}>{t.cancel}</button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {!task.cancelled && task.status !== "DONE" &&
                  (task.stuck ? (
                    <button type="button" className="btn" onClick={() => run(() => A.setStuck(task.id, false))}>✓ {t.stuck}</button>
                  ) : (
                    <button type="button" className="btn" onClick={() => setMode("stuck")}>⚠ {t.needHelp}</button>
                  ))}
                {task.repeating ? (
                  <button type="button" className="btn" onClick={() => run(() => A.stopRepeat(task.id))}>⏹ {t.stopRepeat}</button>
                ) : (
                  <button type="button" className="btn" onClick={() => run(() => A.startRepeat(task.id))}>↻ {t.repeatWeekly}</button>
                )}
                {task.cancelled ? (
                  <button type="button" className="btn" onClick={() => run(() => A.restoreTask(task.id))}>↩ {t.restore}</button>
                ) : (
                  <button type="button" className="btn" onClick={() => setMode("cancel")}>⊘ {t.cancelTask}</button>
                )}
                <button
                  type="button"
                  className="btn text-red-600"
                  onClick={() => confirm(t.delete + "؟") && run(() => A.deleteTask(task.id))}
                >
                  🗑 {t.delete}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{children}</span>;
}
