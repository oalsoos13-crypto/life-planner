import "server-only";
import { prisma } from "@/shared/db";
import { addDays, toDate, toYmd, type Ymd } from "@/shared/kernel/dates";
import { getCompass } from "@/modules/direction/server";
import { PROFILE_AREAS, knowScore, type FactSource, type FactStatus, type ProfileArea } from "./domain/profile";

export type FactView = { id: string; area: ProfileArea; text: string; evidence: string | null; source: FactSource; status: FactStatus; confidence: number };
export type PersonView = { id: string; name: string; relation: string | null; note: string | null; lastContact: Ymd | null; source: string };

/** «قديش بيعرفني» لحاله، للبطاقات الصغيرة (اليوم، المستشار) */
export async function getKnowScore(today: Ymd) {
  const [compass, energyDays, habitDays, captures, confirmed, pending, people, expenses] = await Promise.all([
    getCompass(),
    prisma.dayLog.count({ where: { date: { gte: toDate(addDays(today, -60)) }, energy: { not: null } } }),
    prisma.habitCheck.groupBy({ by: ["date"], where: { date: { gte: toDate(addDays(today, -28)) } } }).then((r) => r.length),
    prisma.capture.count(),
    prisma.profileFact.count({ where: { status: "CONFIRMED" } }),
    prisma.profileFact.count({ where: { status: "NEW" } }),
    prisma.person.count(),
    prisma.expense.count({ where: { date: { gte: toDate(addDays(today, -30)) } } }),
  ]);
  return { ...knowScore({ values: compass.values.length, compassDone: compass.status.done, energyDays, habitDays, captures, confirmed, pending, people, expenses }), compass };
}

export async function getProfile(today: Ymd) {
  const [know, facts, people, settings] = await Promise.all([
    getKnowScore(today),
    prisma.profileFact.findMany({ orderBy: [{ status: "asc" }, { confidence: "desc" }, { updatedAt: "desc" }] }),
    prisma.person.findMany({ orderBy: [{ lastContact: { sort: "asc", nulls: "first" } }, { name: "asc" }] }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { profileLearnedAt: true } }),
  ]);
  const views: FactView[] = facts.map((f) => ({ id: f.id, area: f.area as ProfileArea, text: f.text, evidence: f.evidence, source: f.source as FactSource, status: f.status as FactStatus, confidence: f.confidence }));
  const byArea = PROFILE_AREAS.map((area) => ({ area, facts: views.filter((f) => f.area === area && f.status !== "REJECTED") }));
  return {
    know,
    byArea,
    rejected: views.filter((f) => f.status === "REJECTED"),
    pending: views.filter((f) => f.status === "NEW").length,
    people: people.map<PersonView>((p) => ({ id: p.id, name: p.name, relation: p.relation, note: p.note, lastContact: p.lastContact ? toYmd(p.lastContact) : null, source: p.source })),
    learnedAt: settings?.profileLearnedAt ?? null,
  };
}
export type ProfileView = Awaited<ReturnType<typeof getProfile>>;
