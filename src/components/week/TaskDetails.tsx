"use client";
import { useState, useTransition } from "react";
import * as A from "@/app/actions";
import type { GoalOption } from "@/lib/goals";
import { GoalSelect } from "@/components/GoalSelect";
import type { TaskView } from "./TaskRow";

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

const STATUS_LABEL = { NOT_STARTED: "لسا", IN_PROGRESS: "ماشية", DONE: "خلصت" } as const;

/** تفاصيل المهمة بورقة سفلية (Designing Interfaces: Extras on Demand). كل شي بينحفظ لحاله */
export function TaskDetails({
  task,
  goals,
  editable,
  onStatus,
  onClose,
}: {
  task: TaskView;
  goals: GoalOption[];
  editable: boolean;
  onStatus: (s: TaskView["status"]) => void;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => void (await fn()));
  const [mode, setMode] = useState<"none" | "cancel" | "stuck" | "delete">("none");
  const [reason, setReason] = useState("");
  const [stuckNote, setStuckNote] = useState(task.stuckNote ?? "");
  const [newStep, setNewStep] = useState("");
  const ro = !editable || pending;

  return (
    <div className="space-y-5">
      {!task.cancelled && (
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="الحالة">
          {(["NOT_STARTED", "IN_PROGRESS", "DONE"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={task.status === s}
              disabled={ro}
              onClick={() => onStatus(s)}
              className={`min-h-11 rounded-lg font-bold transition ${task.status === s ? "bg-card text-ink shadow-[var(--shadow-sm)]" : "text-muted"}`}
            >
              {s === "DONE" && task.status === s ? "✓ " : s === "IN_PROGRESS" && task.status === s ? "◐ " : ""}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      {editable && (
        <label className="block">
          <span className="mb-1 block text-[15px] font-bold">المهمة</span>
          <input defaultValue={task.title} onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && run(() => A.updateTask(task.id, { title: e.target.value }))} />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">بتخدم أي هدف؟</span>
        <GoalSelect goals={goals} value={task.goalId ?? ""} disabled={ro} onChange={(v) => run(() => A.updateTask(task.id, { goalId: v || null }))} />
      </label>

      <div>
        <span className="mb-1 block text-[15px] font-bold">الخطوات</span>
        <ul className="space-y-1">
          {task.steps.map((s) => (
            <li key={s.id} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={s.done} disabled={ro} onChange={(e) => run(() => A.toggleStep(s.id, e.target.checked))} aria-label={s.title} />
              <span className={`flex-1 ${s.done ? "text-muted line-through" : ""}`}>{s.title}</span>
              {editable && (
                <button type="button" className="btn btn-text btn-sm h-11 w-11 p-0 text-muted" onClick={() => run(() => A.deleteStep(s.id))} aria-label={`احذف ${s.title}`}>✕</button>
              )}
            </li>
          ))}
        </ul>
        {editable && (
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newStep;
              if (!v.trim()) return;
              setNewStep("");
              run(() => A.addStep(task.id, v));
            }}
          >
            <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="أضف خطوة" aria-label="خطوة جديدة" />
            <button className="btn btn-secondary shrink-0" aria-label="أضف الخطوة">+</button>
          </form>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">ملاحظات</span>
        <textarea rows={3} defaultValue={task.notes ?? ""} disabled={!editable} onBlur={(e) => e.target.value !== (task.notes ?? "") && run(() => A.updateTask(task.id, { notes: e.target.value || null }))} />
      </label>

      {task.status !== "DONE" && (
        <label className="block">
          <span className="mb-1 block text-[15px] font-bold">
            قديش خلص منها: <bdi className="tnum">{task.progress ?? 0}%</bdi>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            className="w-full accent-[var(--color-accent)]"
            defaultValue={task.progress ?? 0}
            disabled={ro}
            onPointerUp={(e) => run(() => A.updateTask(task.id, { progress: Number((e.target as HTMLInputElement).value) }))}
            onKeyUp={(e) => run(() => A.updateTask(task.id, { progress: Number((e.target as HTMLInputElement).value) }))}
          />
        </label>
      )}

      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {task.imageData && <img src={task.imageData} alt="صورة المهمة" className="mb-2 max-h-64 rounded-xl" />}
        {editable && (
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-sm cursor-pointer">
              📷 {task.imageData ? "بدّل الصورة" : "أضف صورة"}
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
            {task.imageData && <button type="button" className="btn btn-text btn-sm" onClick={() => run(() => A.updateTask(task.id, { imageData: null }))}>شيل الصورة</button>}
          </div>
        )}
      </div>

      {editable && (
        <div className="space-y-3 border-t border-line pt-4">
          {mode === "stuck" && (
            <div className="space-y-2 rounded-xl bg-surface-2 p-3">
              <input value={stuckNote} onChange={(e) => setStuckNote(e.target.value)} placeholder="شو ماسكها؟" autoFocus aria-label="شو ماسكها" />
              <button type="button" className="btn btn-secondary w-full" onClick={() => { setMode("none"); run(() => A.setStuck(task.id, true, stuckNote)); }}>علّمها عالقة</button>
            </div>
          )}
          {mode === "cancel" && (
            <div className="space-y-2 rounded-xl bg-surface-2 p-3">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ليش بدك تتركها؟" autoFocus aria-label="السبب" />
              <button type="button" className="btn btn-secondary w-full" onClick={() => { if (!reason.trim()) return; setMode("none"); run(() => A.cancelTask(task.id, reason)); }}>اتركها</button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!task.cancelled && task.status !== "DONE" &&
              (task.stuck ? (
                <button type="button" className="btn btn-sm" onClick={() => run(() => A.setStuck(task.id, false))}>✓ انحلّت</button>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => setMode("stuck")}>⚠ عالقة / محتاج مساعدة</button>
              ))}
            {task.repeating ? (
              <button type="button" className="btn btn-sm" onClick={() => run(() => A.stopRepeat(task.id))}>وقّف التكرار</button>
            ) : (
              <button type="button" className="btn btn-sm" onClick={() => run(() => A.startRepeat(task.id))}>↻ كررها كل أسبوع</button>
            )}
            {task.cancelled ? (
              <button type="button" className="btn btn-sm" onClick={() => run(() => A.restoreTask(task.id))}>رجّعها</button>
            ) : (
              <button type="button" className="btn btn-sm" onClick={() => setMode("cancel")}>اتركها</button>
            )}
            {mode === "delete" ? (
              <button type="button" className="btn btn-sm bg-danger text-card" onClick={() => { onClose(); run(() => A.deleteTask(task.id)); }}>أكيد احذفها</button>
            ) : (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setMode("delete")}>احذف</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
