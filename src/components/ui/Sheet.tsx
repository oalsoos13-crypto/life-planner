"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** ورقة سفلية (Designing Interfaces): بالثلث السفلي قريب من الإبهام (LUX: فيتس) */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  // بوابة لـ body: الورقة فوق كل شي حتى لو أبوها فيه حركة (stacking context)
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-[23px] font-bold leading-snug">{title}</h2>
          <button type="button" onClick={onClose} className="btn btn-text h-11 w-11 p-0 text-muted" aria-label="سكّر">✕</button>
        </div>
        {children}
      </div>
    </>,
    document.body
  );
}
