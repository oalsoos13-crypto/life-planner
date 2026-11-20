import "server-only";
import { prisma } from "@/shared/db";
import { toYmd } from "@/shared/kernel/dates";
import { wheelStats, type SwotKind } from "./domain/wheel";

/** آخر تقييم لكل محور، والتقييم الي قبله (للمقارنة) */
export async function getWheel() {
  const pillars = await prisma.pillar.findMany({ where: { archived: false }, orderBy: { order: "asc" }, include: { wheel: { orderBy: { date: "desc" }, take: 2 } } });
  const entries = pillars.map((p) => ({ pillarId: p.id, name: p.name.replace(/[«»]/g, ""), color: p.color, score: p.wheel[0]?.score ?? null, prev: p.wheel[1]?.score ?? null }));
  const last = pillars.flatMap((p) => p.wheel.map((w) => w.date)).sort((a, b) => b.getTime() - a.getTime())[0];
  return { entries, stats: wheelStats(entries), ratedOn: last ? toYmd(last) : null };
}
export type WheelView = Awaited<ReturnType<typeof getWheel>>;

export async function getSwot() {
  const rows = await prisma.swotItem.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, kind: r.kind as SwotKind, text: r.text }));
}
