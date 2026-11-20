"use client";
import type { GoalOption } from "@/lib/goals";

/** اختيار الهدف: أولويات الربع أول، وبعدين حسب المحور، و«بدون هدف (روتين)» بوضوح (Don't Make Me Think) */
export function GoalSelect({ goals, value, onChange, disabled, id }: { goals: GoalOption[]; value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  const okrs = goals.filter((g) => g.okrRank);
  const groups = new Map<string, GoalOption[]>();
  for (const g of goals.filter((g) => !g.okrRank)) groups.set(g.pillar, [...(groups.get(g.pillar) ?? []), g]);
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">بدون هدف (روتين)</option>
      {okrs.length > 0 && (
        <optgroup label="★ أولويات الربع">
          {okrs.map((g) => (
            <option key={g.id} value={g.id}>{g.okrRank}. {g.title}</option>
          ))}
        </optgroup>
      )}
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
