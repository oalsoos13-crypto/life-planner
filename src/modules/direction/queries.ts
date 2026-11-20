import "server-only";
import { prisma } from "@/shared/db";
import { toYmd } from "@/shared/kernel/dates";
import { compassStatus, type CompassFields } from "./domain/compass";
import type { DecisionOption } from "./domain/decision";

export async function getCompass() {
  const [c, items] = await Promise.all([prisma.compass.findUnique({ where: { id: 1 } }), prisma.compassItem.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }] })]);
  const fields: CompassFields = { bhag: c?.bhag ?? null, picture3y: c?.picture3y ?? null, mission: c?.mission ?? null, winning: c?.winning ?? null, why: c?.why ?? null, eulogy: c?.eulogy ?? null, enough: c?.enough ?? null };
  const by = (k: string) => items.filter((i) => i.kind === k).map((i) => ({ id: i.id, text: i.text, detail: i.detail }));
  const values = by("VALUE"), principles = by("PRINCIPLE"), identity = by("IDENTITY");
  return { fields, enoughNote: c?.enoughNote ?? null, values, principles, identity, status: compassStatus(fields, { VALUE: values.length, PRINCIPLE: principles.length, IDENTITY: identity.length }) };
}
export type CompassView = Awaited<ReturnType<typeof getCompass>>;

export async function getDecisions() {
  const rows = await prisma.decision.findMany({ orderBy: [{ updatedAt: "desc" }], take: 50 });
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    context: d.context,
    options: (d.options as DecisionOption[]) ?? [],
    chosen: d.chosen,
    why: d.why,
    premortem: d.premortem,
    outsideView: d.outsideView,
    biases: (d.biases as string[] | null) ?? [],
    reviewAt: d.reviewAt ? toYmd(d.reviewAt) : null,
    outcome: d.outcome,
    lesson: d.lesson,
    status: d.status,
  }));
}
export type DecisionView = Awaited<ReturnType<typeof getDecisions>>[number];
