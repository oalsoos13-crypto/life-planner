// قراءات شاشة «اليوم» (CQRS خفيف: القراءة مباشرة، بدون حالات استخدام)
import "server-only";
import { prisma } from "@/shared/db";
import { addDays, toDate, toYmd, type Ymd } from "@/shared/kernel/dates";
import { progress } from "@/shared/kernel/metricTarget";
import { missedTwiceRisk, streak } from "./domain/day";

export async function getToday(today: Ymd) {
  const from = toDate(addDays(today, -60));
  const [log, habits] = await Promise.all([
    prisma.dayLog.findUnique({ where: { date: toDate(today) } }),
    prisma.habit.findMany({
      where: { archived: false },
      orderBy: { order: "asc" },
      include: { pillar: true, checks: { where: { date: { gte: from } }, select: { date: true } } },
    }),
  ]);
  return {
    intent: log?.intent ?? null,
    energy: log?.energy ?? null,
    mood: log?.mood ?? null,
    evening: log?.evening ?? null,
    habits: habits.map((h) => {
      const set = new Set(h.checks.map((c) => toYmd(c.date)));
      return {
        id: h.id,
        name: h.name,
        icon: h.icon,
        pillar: h.pillar?.name ?? null,
        color: h.pillar?.color ?? null,
        done: set.has(today),
        streak: streak(set, today),
        risk: missedTwiceRisk(set, today),
      };
    }),
  };
}
export type TodayView = Awaited<ReturnType<typeof getToday>>;

/** المؤشر الأول لكل أولوية مع آخر 8 قراءات، لخطوط الاتجاه الصغيرة */
export async function getKpiStrip(cycleId: string) {
  const okrs = await prisma.goal.findMany({
    where: { cycleId, kind: "OKR" },
    orderBy: { rank: "asc" },
    include: {
      pillar: true,
      metrics: { orderBy: { order: "asc" }, take: 1, include: { readings: { orderBy: { date: "desc" }, take: 8 } } },
    },
  });
  return okrs
    .filter((o) => o.metrics.length)
    .map((o) => {
      const m = o.metrics[0];
      const series = [...m.readings].reverse().map((r) => r.value);
      const latest = m.readings[0]?.value ?? m.start;
      return {
        goalId: o.id,
        rank: o.rank,
        pillar: o.pillar.name.replace(/[«»]/g, ""),
        color: o.pillar.color,
        name: m.name,
        unit: m.unit,
        latest,
        target: m.target,
        series: series.length >= 2 ? series : m.start != null && latest != null ? [m.start, latest] : [],
        progress: progress(m, latest),
      };
    });
}
export type KpiStripItem = Awaited<ReturnType<typeof getKpiStrip>>[number];
