import { prisma } from "./db";
import { toDate, type Ymd } from "./dates";

export type GoalOption = { id: string; title: string; pillar: string; color: string };

// أهداف الدورة الي فيها هالأسبوع (أو آخر دورة إذا ما في)
export async function goalOptions(ws?: Ymd): Promise<GoalOption[]> {
  let cycle = ws
    ? await prisma.cycle.findFirst({ where: { startDate: { lte: toDate(ws) }, endDate: { gte: toDate(ws) } } })
    : null;
  if (!cycle) cycle = await prisma.cycle.findFirst({ orderBy: { startDate: "desc" } });
  if (!cycle) return [];
  const goals = await prisma.goal.findMany({
    where: { cycleId: cycle.id, archived: false },
    include: { pillar: true },
    orderBy: [{ pillar: { order: "asc" } }, { order: "asc" }],
  });
  return goals.map((g) => ({ id: g.id, title: g.title, pillar: g.pillar.name, color: g.pillar.color }));
}
