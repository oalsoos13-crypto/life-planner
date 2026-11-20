import "server-only";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { isValidYmd, toDate } from "@/shared/kernel/dates";
import { COMPASS_FIELDS, COMPASS_ITEM_KINDS, VALUES_MAX, identityShape, type CompassItemKind, type CompassTextField } from "../domain/compass";
import type { DecisionOption } from "../domain/decision";
import { BIASES } from "../domain/decision";

export async function saveCompassField(field: CompassTextField, value: string): Promise<Result<void>> {
  if (!COMPASS_FIELDS.includes(field)) return err("FIELD", "حقل مش معروف");
  const v = value.trim().slice(0, 2000) || null;
  await prisma.compass.upsert({ where: { id: 1 }, update: { [field]: v }, create: { id: 1, [field]: v } });
  return ok(undefined);
}

export async function saveEnough(amount: number | null, note?: string): Promise<Result<void>> {
  if (amount != null && (!Number.isFinite(amount) || amount <= 0)) return err("VALUE", "اكتب رقم أكبر من صفر");
  await prisma.compass.upsert({ where: { id: 1 }, update: { enough: amount, enoughNote: note?.trim() || null }, create: { id: 1, enough: amount, enoughNote: note?.trim() || null } });
  return ok(undefined);
}

export async function addCompassItem(kind: CompassItemKind, text: string, detail?: string): Promise<Result<void>> {
  if (!COMPASS_ITEM_KINDS.includes(kind)) return err("KIND", "نوع مش معروف");
  let t = text.trim().slice(0, 300);
  if (!t) return err("EMPTY", "اكتب شي");
  if (kind === "VALUE" && (await prisma.compassItem.count({ where: { kind } })) >= VALUES_MAX)
    return err("MAX", `${VALUES_MAX} قيم بالكتير. القيمة السادسة عادةً تفضيل مش قيمة (Essentialism)`);
  if (kind === "IDENTITY") t = identityShape(t);
  const order = await prisma.compassItem.count({ where: { kind } });
  await prisma.compassItem.create({ data: { kind, text: t, detail: detail?.trim().slice(0, 500) || null, order } });
  return ok(undefined);
}

export async function removeCompassItem(id: string) {
  await prisma.compassItem.deleteMany({ where: { id } });
}

const cleanOptions = (o: DecisionOption[]) =>
  o.slice(0, 6).map((x) => ({ text: String(x.text ?? "").trim().slice(0, 200), score: x.score == null ? null : Math.max(0, Math.min(10, Math.round(Number(x.score)))) })).filter((x) => x.text);

export type DecisionInput = {
  title: string;
  context?: string | null;
  options: DecisionOption[];
  chosen?: string | null;
  why?: string | null;
  premortem?: string | null;
  outsideView?: string | null;
  biases?: string[];
  reviewAt?: string | null;
  outcome?: string | null;
  lesson?: string | null;
};

export async function saveDecision(id: string | null, d: DecisionInput): Promise<Result<string>> {
  const title = d.title.trim().slice(0, 200);
  if (!title) return err("TITLE", "شو القرار؟");
  if (d.reviewAt && !isValidYmd(d.reviewAt)) return err("DATE", "تاريخ مش صحيح");
  const keys = new Set<string>(BIASES.map((b) => b.key));
  const status = d.outcome?.trim() ? "REVIEWED" : d.chosen?.trim() ? "DECIDED" : "OPEN";
  const data = {
    title,
    context: d.context?.trim() || null,
    options: cleanOptions(d.options),
    chosen: d.chosen?.trim() || null,
    why: d.why?.trim() || null,
    premortem: d.premortem?.trim() || null,
    outsideView: d.outsideView?.trim() || null,
    biases: (d.biases ?? []).filter((b) => keys.has(b)),
    reviewAt: d.reviewAt ? toDate(d.reviewAt) : null,
    outcome: d.outcome?.trim() || null,
    lesson: d.lesson?.trim() || null,
    status,
  };
  const row = id ? await prisma.decision.update({ where: { id }, data }) : await prisma.decision.create({ data });
  return ok(row.id);
}

export async function deleteDecision(id: string) {
  await prisma.decision.deleteMany({ where: { id } });
}
