// حالات الاستخدام: معاملة + تحميل + منطق المجال + حفظ (Clean Architecture)
// الشاشات وServer Actions بتنادي هون؛ ما بتكتب على القاعدة مباشرة (ADR-002).
import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { canAddKeyResult, nextOkrRank, type OkrType } from "../domain/okr";
import { clean, validateChallenge } from "../domain/kernel";
import type { Perspective } from "../domain/perspective";

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function saveKernel(
  cycleId: string,
  input: { coreChallenge?: string; guidingPolicy?: string; guidingPolicyNot?: string; essentialIntent?: string; freeHours?: number | null }
): Promise<Result<void>> {
  const data: Prisma.StrategyKernelUncheckedUpdateInput = {};
  if (input.coreChallenge !== undefined) {
    const c = validateChallenge(input.coreChallenge);
    if (!c.ok) return c;
    data.coreChallenge = c.value;
  }
  if (input.guidingPolicy !== undefined) data.guidingPolicy = clean(input.guidingPolicy);
  if (input.guidingPolicyNot !== undefined) data.guidingPolicyNot = clean(input.guidingPolicyNot);
  if (input.essentialIntent !== undefined) data.essentialIntent = clean(input.essentialIntent);
  if (input.freeHours !== undefined) {
    if (input.freeHours != null && (!(input.freeHours >= 0) || input.freeHours > 168)) return err("HOURS", "الساعات بين 0 و168");
    data.freeHours = input.freeHours;
  }
  await prisma.strategyKernel.upsert({
    where: { cycleId },
    update: data,
    create: { ...(data as Prisma.StrategyKernelUncheckedCreateInput), cycleId },
  });
  return ok(undefined);
}

export async function confirmDraft(cycleId: string) {
  await prisma.$transaction([
    prisma.strategyKernel.updateMany({ where: { cycleId }, data: { isDraft: false } }),
    prisma.strategicGoal.updateMany({ data: { isDraft: false } }),
  ]);
}

export async function promoteToOkr(input: { goalId: string; type: OkrType; strategicGoalId?: string | null }): Promise<Result<number>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findUniqueOrThrow({ where: { id: input.goalId } });
      if (goal.kind === "OKR") return ok(goal.rank!);
      const taken = await tx.goal.findMany({ where: { cycleId: goal.cycleId, kind: "OKR" }, select: { rank: true } });
      const rank = nextOkrRank(taken.map((t) => t.rank!));
      if (!rank.ok) return rank;
      await tx.goal.update({
        where: { id: goal.id },
        data: { kind: "OKR", rank: rank.value, okrType: input.type, strategicGoalId: input.strategicGoalId ?? goal.strategicGoalId },
      });
      return rank;
    });
  } catch (e) {
    // سباق بين تابين: القيد unique(cycleId, rank) رفض الرابع
    if (isUniqueViolation(e)) return nextOkrRank([1, 2, 3]);
    throw e;
  }
}

export async function demoteOkr(goalId: string) {
  await prisma.goal.update({ where: { id: goalId }, data: { kind: "MAINTENANCE", rank: null, okrType: null } });
}

export async function updateOkr(goalId: string, input: { title?: string; okrType?: OkrType; strategicGoalId?: string | null; weeklyHours?: number | null }): Promise<Result<void>> {
  const data: Prisma.GoalUncheckedUpdateInput = {};
  if (input.title !== undefined) {
    const t = clean(input.title);
    if (!t) return err("TITLE", "الهدف بحاجة اسم");
    data.title = t;
  }
  if (input.okrType) data.okrType = input.okrType;
  if (input.strategicGoalId !== undefined) data.strategicGoalId = input.strategicGoalId || null;
  if (input.weeklyHours !== undefined) {
    if (input.weeklyHours != null && !(input.weeklyHours >= 0 && input.weeklyHours <= 100)) return err("HOURS", "ساعات مش منطقية");
    data.weeklyHours = input.weeklyHours;
  }
  await prisma.goal.update({ where: { id: goalId }, data });
  return ok(undefined);
}

export type MetricInput = { name: string; unit?: string | null; start?: number | null; target?: number | null; direction: "UP" | "DOWN"; role?: "LEADING" | "LAGGING" };

function metricData(m: Partial<MetricInput>) {
  const d: Prisma.MetricUncheckedUpdateInput = {};
  if (m.name !== undefined) d.name = m.name.trim();
  if (m.unit !== undefined) d.unit = clean(m.unit);
  if (m.start !== undefined) d.start = Number.isFinite(m.start) ? m.start : null;
  if (m.target !== undefined) d.target = Number.isFinite(m.target) ? m.target : null;
  if (m.direction) d.direction = m.direction;
  if (m.role) d.role = m.role;
  return d;
}

export async function addKeyResult(goalId: string, m: MetricInput): Promise<Result<string>> {
  if (!m.name.trim()) return err("NAME", "النتيجة بحاجة اسم");
  return prisma.$transaction(async (tx) => {
    const n = await tx.metric.count({ where: { goalId } });
    const can = canAddKeyResult(n);
    if (!can.ok) return can;
    const row = await tx.metric.create({ data: { ...(metricData(m) as Prisma.MetricUncheckedCreateInput), goalId, order: n } });
    return ok(row.id);
  });
}

export async function addStrategicMetric(strategicGoalId: string, m: MetricInput) {
  if (!m.name.trim()) return err("NAME", "المؤشر بحاجة اسم");
  const row = await prisma.metric.create({ data: { ...(metricData(m) as Prisma.MetricUncheckedCreateInput), strategicGoalId } });
  return ok(row.id);
}

export async function updateMetric(id: string, m: Partial<MetricInput>) {
  if (m.name !== undefined && !m.name.trim()) return err("NAME", "المؤشر بحاجة اسم");
  await prisma.metric.update({ where: { id }, data: metricData(m) });
  return ok(undefined);
}

export async function deleteMetric(id: string) {
  await prisma.metric.delete({ where: { id } });
}

export async function saveStrategicGoal(input: { id?: string; title: string; perspective: Perspective; horizonEnd?: string }): Promise<Result<string>> {
  const title = clean(input.title);
  if (!title) return err("TITLE", "الهدف بحاجة اسم");
  if (input.id) {
    await prisma.strategicGoal.update({ where: { id: input.id }, data: { title, perspective: input.perspective } });
    return ok(input.id);
  }
  const n = await prisma.strategicGoal.count({ where: { archived: false } });
  const row = await prisma.strategicGoal.create({
    data: { title, perspective: input.perspective, horizonEnd: new Date((input.horizonEnd ?? "2029-12-31") + "T00:00:00Z"), order: n },
  });
  return ok(row.id);
}

export async function archiveStrategicGoal(id: string) {
  await prisma.strategicGoal.update({ where: { id }, data: { archived: true } });
}

export async function addNotDoing(cycleId: string, text: string, reason?: string, pillarId?: string | null): Promise<Result<void>> {
  const t = clean(text);
  if (!t) return err("TEXT", "شو بدك تترك؟");
  const n = await prisma.notDoing.count({ where: { cycleId } });
  await prisma.notDoing.create({ data: { cycleId, text: t, reason: clean(reason), pillarId: pillarId || null, order: n } });
  return ok(undefined);
}

export async function deleteNotDoing(id: string) {
  await prisma.notDoing.delete({ where: { id } });
}
