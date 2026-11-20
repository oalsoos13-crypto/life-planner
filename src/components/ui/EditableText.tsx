"use client";
import { useRef, useState, useTransition } from "react";

/**
 * نص بينكبس فبيصير حقل، وبينحفظ لحاله لما تطلع منه (MI: حفظ تلقائي بدل زر «احفظ»).
 * الخطأ بيطلع تحت الحقل بلغة المنهجية، والقيمة ما بتضيع.
 */
export function EditableText({
  value,
  placeholder,
  onSave,
  maxLength,
  className = "",
  multiline = true,
  label,
}: {
  value: string | null;
  placeholder: string;
  onSave: (v: string) => Promise<{ ok: boolean; message?: string }>;
  maxLength?: number;
  className?: string;
  multiline?: boolean;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [shown, setShown] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  const commit = () => {
    const v = draft.trim();
    if (v === (shown ?? "")) return setEditing(false);
    start(async () => {
      const r = await onSave(v);
      if (r.ok) {
        setShown(v || null);
        setError(null);
        setEditing(false);
        setSavedAt(Date.now());
      } else setError(r.message ?? "ما انحفظ");
    });
  };

  if (!editing)
    return (
      <div className="relative">
        <button
          type="button"
          aria-label={`عدّل: ${label}`}
          onClick={() => {
            setDraft(shown ?? "");
            setEditing(true);
            setTimeout(() => ref.current?.focus(), 0);
          }}
          className={`block w-full rounded-lg text-start transition active:bg-surface-2 ${shown ? "" : "text-muted"} ${className}`}
        >
          {shown || placeholder}
        </button>
        {savedAt > 0 && (
          <span key={savedAt} className="saved-flash absolute -top-6 end-0 text-[13px] font-medium text-success">انحفظ ✓</span>
        )}
      </div>
    );

  return (
    <div>
      <textarea
        ref={ref}
        aria-label={label}
        value={draft}
        rows={multiline ? 3 : 1}
        maxLength={maxLength ? maxLength + 50 : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        className="resize-none"
        disabled={pending}
      />
      <div className="mt-1 flex justify-between text-[13px]">
        <span className={error ? "text-danger" : "text-muted"}>{error ?? (pending ? "عم يحفظ…" : "بينحفظ لحاله لما تطلع")}</span>
        {maxLength && (
          <span className={`tnum ${draft.trim().length > maxLength ? "text-danger" : "text-muted"}`}>
            {draft.trim().length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
