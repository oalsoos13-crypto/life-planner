"use server";
// محوّلات رفيعة لشاشة «اليوم»: مدخلات ← حالة استخدام ← تحديث الشاشة
import { revalidatePath } from "next/cache";
import { dailyUseCases as UC } from "@/modules/daily/server";
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
export async function captureText(text: string, source: "TEXT" | "VOICE") {
  return done(await UC.capture(text, source));
}
