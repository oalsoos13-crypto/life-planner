"use client";
import type { GoalOption } from "@/lib/goals";
import { useI18n } from "./I18n";

export function GoalSelect({ goals, value, onChange, disabled }: { goals: GoalOption[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { t } = useI18n();
  const groups = new Map<string, GoalOption[]>();
  for (const g of goals) groups.set(g.pillar, [...(groups.get(g.pillar) ?? []), g]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{t.routine}</option>
      {[...groups.entries()].map(([p, gs]) => (
        <optgroup key={p} label={p}>
          {gs.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
