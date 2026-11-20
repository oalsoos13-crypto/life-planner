"use server";
// محوّلات رفيعة (Clean Architecture): تحقق من المدخلات ← حالة استخدام ← تحديث الشاشة
import { revalidatePath } from "next/cache";
import { strategyUseCases as UC } from "@/modules/strategy/server";
import { recordReading } from "@/modules/measurement/server";
import type { MetricInput } from "@/modules/strategy/server";
import type { OkrType, Perspective } from "@/modules/strategy";
import { todayYmd } from "@/shared/kernel/dates";

type R = { ok: true } | { ok: false; message: string };
const done = (r?: { ok: boolean; message?: string }): R => {
  revalidatePath("/", "layout");
  return r && !r.ok ? { ok: false, message: r.message ?? "صار خطأ" } : { ok: true };
};

export async function saveKernelField(cycleId: string, field: "coreChallenge" | "guidingPolicy" | "guidingPolicyNot" | "essentialIntent", value: string) {
  return done(await UC.saveKernel(cycleId, { [field]: value }));
}
export async function saveFreeHours(cycleId: string, hours: number | null) {
  return done(await UC.saveKernel(cycleId, { freeHours: hours }));
}
export async function confirmStrategy(cycleId: string) {
  await UC.confirmDraft(cycleId);
  return done();
}
export async function promote(goalId: string, type: OkrType, strategicGoalId?: string | null) {
  return done(await UC.promoteToOkr({ goalId, type, strategicGoalId }));
}
export async function demote(goalId: string) {
  await UC.demoteOkr(goalId);
  return done();
}
export async function swapOkr(outId: string, inId: string, type: OkrType) {
  await UC.demoteOkr(outId);
  return done(await UC.promoteToOkr({ goalId: inId, type }));
}
export async function editOkr(goalId: string, input: { title?: string; okrType?: OkrType; strategicGoalId?: string | null; weeklyHours?: number | null }) {
  return done(await UC.updateOkr(goalId, input));
}
export async function addKr(goalId: string, m: MetricInput) {
  return done(await UC.addKeyResult(goalId, m));
}
export async function addSgMetric(sgId: string, m: MetricInput) {
  return done(await UC.addStrategicMetric(sgId, m));
}
export async function editMetric(id: string, m: Partial<MetricInput>) {
  return done(await UC.updateMetric(id, m));
}
export async function removeMetric(id: string) {
  await UC.deleteMetric(id);
  return done();
}
export async function checkIn(metricId: string, value: number) {
  return done(await recordReading(metricId, todayYmd(), value));
}
export async function saveSg(input: { id?: string; title: string; perspective: Perspective }) {
  return done(await UC.saveStrategicGoal(input));
}
export async function archiveSg(id: string) {
  await UC.archiveStrategicGoal(id);
  return done();
}
export async function addNo(cycleId: string, text: string, reason: string) {
  return done(await UC.addNotDoing(cycleId, text, reason));
}
export async function removeNo(id: string) {
  await UC.deleteNotDoing(id);
  return done();
}
