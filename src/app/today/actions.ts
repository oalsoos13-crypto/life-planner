"use server";
// محوّلات رفيعة لشاشة «اليوم»: مدخلات ← حالة استخدام ← تحديث الشاشة
import { revalidatePath } from "next/cache";
import { dailyUseCases as UC } from "@/modules/daily/server";
import { advisorUseCases as AD } from "@/modules/advisor/server";
import { getContext } from "@/lib/week";

type R = { ok: true } | { ok: false; message: string };
const done = (r: { ok: boolean; message?: string }): R => {
  revalidatePath("/", "layout");
  return r.ok ? { ok: true } : { ok: false, message: r.message ?? "صار خطأ" };
};
const today = async () => (await getContext()).today;

export async function saveIntent(text: string) {
  return done(await UC.setIntent(await today(), text));
}
export async function saveFeeling(field: "energy" | "mood", value: number | null) {
  return done(await UC.setFeeling(await today(), field, value));
}
export async function saveEvening(text: string) {
  return done(await UC.setEvening(await today(), text));
}
export async function toggleHabit(habitId: string, isDone: boolean) {
  return done(await UC.toggleHabit(habitId, await today(), isDone));
}
export async function newHabit(name: string, icon: string, pillarId: string | null) {
  return done(await UC.addHabit(name, icon, pillarId));
}
export async function removeHabit(habitId: string) {
  return done(await UC.archiveHabit(habitId));
}
/** الالتقاط الذكي: بيحفظ، بيفهم، وبيطبّق لحاله. بيرجّع شو فهم عشان تشوفه وتتراجع إذا بدك */
export async function captureText(text: string, source: "TEXT" | "VOICE") {
  const { today, currentWeek } = await getContext();
  const r = await AD.captureAndApply(text, source, today, currentWeek);
  revalidatePath("/", "layout");
  return r.ok ? { ok: true as const, analyzer: r.value.analyzer, items: r.value.items } : { ok: false as const, message: r.message };
}
export async function undoCapture(itemId: string) {
  return done(await AD.undoItem(itemId));
}
export async function askAdvisor(question: string) {
  const r = await AD.ask(question, await today());
  revalidatePath("/advisor");
  return r.ok ? { ok: true as const, answer: r.value } : { ok: false as const, message: r.message };
}
