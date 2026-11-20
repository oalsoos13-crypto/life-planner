import "server-only";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { isValidYmd, toDate, type Ymd } from "@/shared/kernel/dates";
import { SWOT_KINDS, clampScore, type SwotKind } from "../domain/wheel";

export async function rateWheel(date: Ymd, scores: { pillarId: string; score: number }[]): Promise<Result<void>> {
  if (!isValidYmd(date)) return err("DATE", "تاريخ مش صحيح");
  await prisma.$transaction(
    scores.map((s) =>
      prisma.wheelScore.upsert({
        where: { date_pillarId: { date: toDate(date), pillarId: s.pillarId } },
        update: { score: clampScore(s.score) },
        create: { date: toDate(date), pillarId: s.pillarId, score: clampScore(s.score) },
      }),
    ),
  );
  return ok(undefined);
}

export async function addSwot(kind: SwotKind, text: string): Promise<Result<void>> {
  if (!SWOT_KINDS.includes(kind)) return err("KIND", "نوع مش معروف");
  const t = text.trim().slice(0, 300);
  if (!t) return err("EMPTY", "اكتب شي");
  await prisma.swotItem.create({ data: { kind, text: t } });
  return ok(undefined);
}
export async function removeSwot(id: string) {
  await prisma.swotItem.deleteMany({ where: { id } });
}
