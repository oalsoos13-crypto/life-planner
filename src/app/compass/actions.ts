"use server";
// محوّلات رفيعة للبوصلة والتشخيص والقرارات
import { revalidatePath } from "next/cache";
import { directionUseCases as D, type DecisionInput } from "@/modules/direction/server";
import { diagnosisUseCases as G } from "@/modules/diagnosis/server";
import type { CompassItemKind, CompassTextField } from "@/modules/direction";
import type { SwotKind } from "@/modules/diagnosis";
import { getContext } from "@/lib/week";

type R = { ok: true } | { ok: false; message: string };
const done = (r?: { ok: boolean; message?: string }): R => {
  revalidatePath("/", "layout");
  return r && !r.ok ? { ok: false, message: r.message ?? "صار خطأ" } : { ok: true };
};

export async function saveCompass(field: CompassTextField, value: string) {
  return done(await D.saveCompassField(field, value));
}
export async function saveEnough(amount: number | null, note?: string) {
  return done(await D.saveEnough(amount, note));
}
export async function addItem(kind: CompassItemKind, text: string, detail?: string) {
  return done(await D.addCompassItem(kind, text, detail));
}
export async function removeItem(id: string) {
  await D.removeCompassItem(id);
  return done();
}
export async function rateWheel(scores: { pillarId: string; score: number }[]) {
  return done(await G.rateWheel((await getContext()).today, scores));
}
export async function addSwot(kind: SwotKind, text: string) {
  return done(await G.addSwot(kind, text));
}
export async function removeSwot(id: string) {
  await G.removeSwot(id);
  return done();
}
export async function saveDecision(id: string | null, d: DecisionInput) {
  const r = await D.saveDecision(id, d);
  revalidatePath("/", "layout");
  return r.ok ? { ok: true as const, id: r.value } : { ok: false as const, message: r.message };
}
export async function deleteDecision(id: string) {
  await D.deleteDecision(id);
  return done();
}
