import "server-only";
import { prisma } from "@/shared/db";
import { maskPhone } from "./domain/outreach";

export async function getOutreach() {
  const [posts, msgs, s, people] = await Promise.all([
    prisma.socialPost.findMany({ orderBy: { scheduledAt: "desc" }, take: 20 }),
    prisma.waMessage.findMany({ orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { businessFaq: true, waAutoReply: true } }),
    prisma.person.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, relation: true } }),
  ]);
  // محادثات حسب العميل، آخر وحدة فوق. الرقم بينعرض مخفي (آخر 4 أرقام)
  const byPeer = new Map<string, typeof msgs>();
  for (const m of msgs) byPeer.set(m.peer, [...(byPeer.get(m.peer) ?? []), m]);
  const threads = [...byPeer.entries()].slice(0, 15).map(([peer, ms]) => ({
    peer,
    label: maskPhone(peer),
    last: ms[0].createdAt,
    waiting: ms[0].direction === "IN",
    messages: ms.slice(0, 8).reverse().map((m) => ({ id: m.id, direction: m.direction as "IN" | "OUT", text: m.text, auto: m.auto, at: m.createdAt })),
  }));
  return {
    posts: posts.map((p) => ({ ...p, channels: p.channels as { id: string; name: string; identifier: string }[] })),
    threads,
    faq: s?.businessFaq ?? "",
    autoReply: s?.waAutoReply ?? true,
    people,
  };
}
export type OutreachView = Awaited<ReturnType<typeof getOutreach>>;
