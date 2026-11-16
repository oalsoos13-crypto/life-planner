"use client";
import { useState, useTransition } from "react";
import { saveReview } from "@/app/actions";
import { useI18n } from "./I18n";

export function ReviewForm({ weekStart, learned, top3 }: { weekStart: string; learned: string; top3: string[] }) {
  const { t } = useI18n();
  const [l, setL] = useState(learned);
  const [tops, setTops] = useState([top3[0] ?? "", top3[1] ?? "", top3[2] ?? ""]);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveReview(weekStart, l, tops);
          setSaved(true);
        });
      }}
    >
      <label className="block space-y-2">
        <span className="font-bold">{t.learned}</span>
        <textarea rows={3} value={l} onChange={(e) => { setL(e.target.value); setSaved(false); }} />
      </label>
      <div className="space-y-2">
        <span className="font-bold">{t.top3}</span>
        {tops.map((v, i) => (
          <input key={i} value={v} placeholder={`${i + 1}.`} onChange={(e) => { const n = [...tops]; n[i] = e.target.value; setTops(n); setSaved(false); }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>{t.save}</button>
        {saved && <span className="text-sm text-emerald-600">{t.saved}</span>}
      </div>
    </form>
  );
}
