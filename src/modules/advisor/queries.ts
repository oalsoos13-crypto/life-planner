import "server-only";
import { prisma } from "@/shared/db";
import { toDate, type Ymd } from "@/shared/kernel/dates";

/** «شو انسجّل اليوم»: كل شي فهمه المستشار من كلامك اليوم، مع حالة التراجع */
export async function getTodayLog(today: Ymd) {
  const items = await prisma.captureItem.findMany({ where: { capture: { createdAt: { gte: toDate(today) } } }, orderBy: { createdAt: "desc" }, take: 60 });
  return items.map((i) => ({ id: i.id, kind: i.kind, summary: i.summary, chain: i.chain, undone: !!i.undoneAt, at: i.createdAt.toISOString() }));
}
export type TodayLogItem = Awaited<ReturnType<typeof getTodayLog>>[number];

export async function getAdvisorThread() {
  const rows = await prisma.advisorMessage.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  return rows.reverse().map((m) => ({ id: m.id, role: m.role as "user" | "assistant", text: m.text }));
}

export async function getMonthExpenses(today: Ymd) {
  const start = toDate(today.slice(0, 8) + "01");
  const rows = await prisma.expense.groupBy({ by: ["category"], where: { date: { gte: start } }, _sum: { amount: true } });
  return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 })).sort((a, b) => b.total - a.total);
}
