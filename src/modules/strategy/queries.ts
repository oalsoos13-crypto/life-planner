// قراءات للصفحات (حد جزئي: القراءة مباشرة بدون حالات استخدام، ADR-002)
import "server-only";
import { prisma } from "@/shared/db";
import { toDate, toYmd, type Ymd } from "@/shared/kernel/dates";
import { progress } from "@/shared/kernel/metricTarget";
import { auditStrategy } from "./domain/audit";
import { okrScore, scoreBand, type OkrType } from "./domain/okr";
import type { Perspective } from "./domain/perspective";

export async function activeCycle(today: Ymd) {
  const d = toDate(today);
  return prisma.cycle.findFirst({
    where: { OR: [{ startDate: { lte: d }, endDate: { gte: d } }, { startDate: { gt: d } }] },
    orderBy: { startDate: "asc" },
  });
}

const metricInclude = { readings: { orderBy: { date: "desc" as const }, take: 2 } };

type MetricRow = {
  id: string; name: string; unit: string | null; start: number | null; target: number | null;
  direction: "UP" | "DOWN"; role: "LEADING" | "LAGGING";
  readings: { date: Date; value: number }[];
};

export type MetricView = ReturnType<typeof metricView>;
function metricView(m: MetricRow) {
  const latest = m.readings[0] ?? null;
  const prev = m.readings[1] ?? null;
  return {
    id: m.id,
    name: m.name,
    unit: m.unit,
    start: m.start,
    target: m.target,
    direction: m.direction,
    role: m.role,
    latest: latest?.value ?? null,
    latestDate: latest ? toYmd(latest.date) : null,
    trend: latest && prev ? Math.sign(latest.value - prev.value) : 0,
    progress: progress(m, latest?.value ?? m.start),
  };
}

export async function getStrategyView(today: Ymd) {
  const cycle = await activeCycle(today);
  if (!cycle) return null;
  const [kernel, strategicGoals, goals, notDoing, pillars] = await Promise.all([
    prisma.strategyKernel.findUnique({ where: { cycleId: cycle.id } }),
    prisma.strategicGoal.findMany({ where: { archived: false }, orderBy: { order: "asc" }, include: { metrics: { include: metricInclude, orderBy: { order: "asc" } } } }),
    prisma.goal.findMany({
      where: { cycleId: cycle.id, archived: false },
      include: { pillar: true, metrics: { include: metricInclude, orderBy: { order: "asc" } } },
      orderBy: [{ rank: "asc" }, { pillar: { order: "asc" } }, { order: "asc" }],
    }),
    prisma.notDoing.findMany({ where: { cycleId: cycle.id }, include: { pillar: true }, orderBy: { order: "asc" } }),
    prisma.pillar.findMany({ where: { archived: false }, orderBy: { order: "asc" } }),
  ]);

  const okrs = goals
    .filter((g) => g.kind === "OKR")
    .map((g) => {
      const krs = g.metrics.map(metricView);
      const score = okrScore(g.metrics.map((m) => ({ ...m, latest: m.readings[0]?.value ?? null })));
      return {
        id: g.id,
        rank: g.rank!,
        title: g.title,
        type: (g.okrType ?? "COMMITTED") as OkrType,
        weeklyHours: g.weeklyHours,
        strategicGoalId: g.strategicGoalId,
        pillar: { name: g.pillar.name, color: g.pillar.color },
        notes: g.notes,
        krs,
        score,
        band: scoreBand(score),
      };
    });

  const maintenance = goals
    .filter((g) => g.kind !== "OKR")
    .map((g) => ({ id: g.id, title: g.title, pillarId: g.pillarId, pillar: g.pillar.name, color: g.pillar.color, metric: g.metrics[0] ? metricView(g.metrics[0]) : null }));

  const sgs = strategicGoals.map((s) => ({
    id: s.id,
    title: s.title,
    perspective: s.perspective as Perspective,
    isDraft: s.isDraft,
    metrics: s.metrics.map(metricView),
    okrIds: okrs.filter((o) => o.strategicGoalId === s.id).map((o) => o.id),
  }));

  const warnings = auditStrategy({
    kernel: {
      coreChallenge: kernel?.coreChallenge ?? null,
      guidingPolicy: kernel?.guidingPolicy ?? null,
      essentialIntent: kernel?.essentialIntent ?? null,
      freeHours: kernel?.freeHours ?? null,
    },
    strategicGoals: sgs.map((s) => ({ id: s.id, title: s.title, perspective: s.perspective, metricCount: s.metrics.length })),
    okrs: okrs.map((o) => ({ id: o.id, title: o.title, strategicGoalId: o.strategicGoalId, weeklyHours: o.weeklyHours, krs: o.krs })),
    notDoingCount: notDoing.length,
  });

  const startMs = cycle.startDate.getTime();
  const weekNo = Math.max(1, Math.min(13, Math.floor((toDate(today).getTime() - startMs) / (7 * 864e5)) + 1));
  const started = toDate(today) >= cycle.startDate;

  return {
    cycle: { id: cycle.id, name: cycle.name, start: toYmd(cycle.startDate), end: toYmd(cycle.endDate), weekNo, started },
    kernel: kernel && {
      coreChallenge: kernel.coreChallenge,
      guidingPolicy: kernel.guidingPolicy,
      guidingPolicyNot: kernel.guidingPolicyNot,
      essentialIntent: kernel.essentialIntent,
      freeHours: kernel.freeHours,
      isDraft: kernel.isDraft,
    },
    strategicGoals: sgs,
    okrs,
    maintenance,
    notDoing: notDoing.map((n) => ({ id: n.id, text: n.text, reason: n.reason, pillar: n.pillar?.name ?? null, color: n.pillar?.color ?? null })),
    pillars: pillars.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    warnings,
    plannedHours: okrs.reduce((a, o) => a + (o.weeklyHours ?? 0), 0),
  };
}

export type StrategyView = NonNullable<Awaited<ReturnType<typeof getStrategyView>>>;
