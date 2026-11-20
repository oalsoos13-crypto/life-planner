"use client";
import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { undoCapture } from "@/app/today/actions";

export type LogItem = { id: string; kind: string; summary: string; chain: string | null; undone?: boolean };

const KIND: Record<string, { icon: string; label: string; color: string }> = {
  TASK: { icon: "ListChecks", label: "مهمة", color: "#5ec8ff" },
  HABIT: { icon: "Footprints", label: "عادة", color: "#7fe0b0" },
  EXPENSE: { icon: "Wallet", label: "مصروف", color: "#ffc56b" },
  METRIC: { icon: "Gauge", label: "مؤشر", color: "#c4b5ff" },
  ENERGY: { icon: "BatteryMedium", label: "طاقة", color: "#ffb38a" },
  MOOD: { icon: "Smile", label: "مزاج", color: "#ff9ec7" },
  NOTE: { icon: "Lightbulb", label: "فكرة", color: "#9fdcff" },
};

/**
 * «شو انسجّل»: كل شي فهمه المستشار وطبّقه لحاله، مع السلسلة لوين بيحرّك، وزر تراجع لكل وحدة
 * (Microinteractions: تراجع بدل شاشة تأكيد).
 */
export function CaptureLog({ items, empty }: { items: LogItem[]; empty?: string }) {
  const [list, mark] = useOptimistic(items, (cur: LogItem[], id: string) => cur.map((x) => (x.id === id ? { ...x, undone: true } : x)));
  const [, start] = useTransition();
  if (!list.length) return empty ? <p className="text-[14px] text-muted">{empty}</p> : null;
  return (
    <ul className="space-y-2">
      {list.map((it) => {
        const k = KIND[it.kind] ?? KIND.NOTE;
        return (
          <li key={it.id} className={`card flex items-center gap-3 px-3.5 py-3 transition ${it.undone ? "opacity-45" : ""}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-line bg-surface-2" style={{ color: k.color }}>
              <Icon name={k.icon} size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] font-semibold leading-snug ${it.undone ? "line-through" : ""}`}>
                <span className="text-muted">{k.label}: </span>
                {it.summary}
              </span>
              {it.chain && <span className="block truncate text-[12.5px] text-muted">{it.chain}</span>}
            </span>
            {it.undone ? (
              <span className="text-[12px] text-muted">تراجعت</span>
            ) : (
              <button
                type="button"
                aria-label={`تراجع عن «${it.summary}»`}
                onClick={() => start(async () => { mark(it.id); await undoCapture(it.id); })}
                className="btn btn-sm btn-text -me-1 text-muted"
              >
                <Icon name="Undo2" size={17} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
