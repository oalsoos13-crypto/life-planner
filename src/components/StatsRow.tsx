import type { Dict } from "@/lib/i18n";

export function StatsRow({ t, s }: { t: Dict; s: { total: number; done: number; stuck: number; overdue: number; pct: number | null } }) {
  const items = [
    { label: t.done, value: `${s.done}/${s.total}`, cls: "text-emerald-600 dark:text-emerald-400" },
    { label: t.stuckCount, value: s.stuck, cls: "text-orange-600 dark:text-orange-400" },
    { label: t.overdueCount, value: s.overdue, cls: "text-red-600 dark:text-red-400" },
  ];
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted">{t.completion}</span>
        <span className="font-bold">{s.pct ?? 0}%</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${s.pct ?? 0}%` }} />
      </div>
      <div className="grid grid-cols-3 text-center">
        {items.map((i) => (
          <div key={i.label}>
            <div className={`text-2xl font-extrabold ${i.cls}`}>{i.value}</div>
            <div className="text-xs text-muted">{i.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
