import { Shell } from "@/components/Shell";
import { getDict } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { getContext } from "@/lib/week";

// نظرة للقراءة بس على الخطة المحمّلة. التعديل والنسب بالمرحلة الثانية.
export default async function StrategyPreview() {
  const { settings } = await getContext();
  const t = getDict(settings.locale);
  const ar = settings.locale === "ar";
  const pillars = await prisma.pillar.findMany({
    where: { archived: false },
    orderBy: { order: "asc" },
    include: { goals: { where: { archived: false }, orderBy: { order: "asc" }, include: { supports: { include: { to: true } } } } },
  });
  return (
    <Shell title={t.strategy}>
      <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        {ar ? "هاي نظرة على خطتك المحمّلة. التعديل والنسب والخريطة جايين بالمراحل الجاية." : "Read-only preview of your plan. Editing and scores come in the next phases."}
      </p>
      <div className="space-y-3">
        {pillars.map((p) => (
          <section key={p.id} className="card overflow-hidden">
            <h2 className="flex items-center gap-2 px-4 py-3 font-bold" style={{ borderInlineStart: `5px solid ${p.color}` }}>{p.name}</h2>
            <ul className="divide-y divide-line border-t border-line">
              {p.goals.map((g) => (
                <li key={g.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{g.title}</span>
                    <span className="shrink-0 text-xs text-muted">{"●".repeat(g.weight)}</span>
                  </div>
                  {g.kpiName && (
                    <div className="mt-1 text-xs text-muted">
                      📈 {g.kpiName}: {g.kpiStart ?? "؟"} {g.kpiDirection === "DOWN" ? "↘" : "↗"} {g.kpiTarget ?? "؟"} {g.kpiUnit}
                    </div>
                  )}
                  {g.supports.length > 0 && (
                    <div className="mt-1 text-xs text-muted">{ar ? "بيدعم" : "Supports"}: {g.supports.map((s) => s.to.title).join("، ")}</div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
