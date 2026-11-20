// السياق الي بيشوفه المستشار: عاداتك، أولوياتك ومؤشراتها، وأهدافك الاستراتيجية. من القاعدة بس، ما في شي من الكود.
import "server-only";
import { prisma } from "@/shared/db";
import type { CaptureContext } from "../domain/capture";
import type { Ymd } from "@/shared/kernel/dates";

const strip = (s: string) => s.replace(/[«»]/g, "");

export async function loadContext(today: Ymd): Promise<CaptureContext> {
  const cycle = await prisma.cycle.findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "asc" }, include: { kernel: true } });
  const [habits, goals] = await Promise.all([
    prisma.habit.findMany({ where: { archived: false }, orderBy: { order: "asc" }, include: { pillar: true } }),
    cycle
      ? prisma.goal.findMany({
          where: { cycleId: cycle.id, archived: false },
          orderBy: [{ rank: "asc" }, { order: "asc" }],
          include: { pillar: true, strategicGoal: true, metrics: { orderBy: { order: "asc" }, include: { readings: { orderBy: { date: "desc" }, take: 1 } } } },
        })
      : [],
  ]);
  return {
    today,
    habits: habits.map((h) => ({ id: h.id, name: h.name, pillar: h.pillar ? strip(h.pillar.name) : null })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      pillar: strip(g.pillar.name),
      rank: g.rank,
      strategicGoal: g.strategicGoal?.title ?? null,
      metrics: g.metrics.map((m) => ({ id: m.id, name: m.name, unit: m.unit, latest: m.readings[0]?.value ?? m.start ?? null })),
    })),
    essentialIntent: cycle?.kernel?.essentialIntent ?? null,
  };
}
