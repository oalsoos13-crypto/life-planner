"use server";
// محوّلات رفيعة للملف الحي ودفتر العلاقات
import { revalidatePath } from "next/cache";
import { profileUseCases as P, type PersonView } from "@/modules/profile/server";
import type { ProfileArea } from "@/modules/profile";
import { getContext } from "@/lib/week";

type R = { ok: true; message?: string } | { ok: false; message: string };
const done = (r?: { ok: boolean; message?: string }): R => {
  revalidatePath("/", "layout");
  return r && !r.ok ? { ok: false, message: r.message ?? "صار خطأ" } : { ok: true };
};

export async function confirmFact(id: string) {
  await P.confirmFact(id);
  return done();
}
export async function rejectFact(id: string) {
  await P.rejectFact(id);
  return done();
}
export async function restoreFact(id: string) {
  await P.restoreFact(id);
  return done();
}
export async function correctFact(id: string, text: string) {
  return done(await P.correctFact(id, text));
}
export async function addFact(area: ProfileArea, text: string) {
  return done(await P.addFact(area, text));
}
export async function learnNow(): Promise<R> {
  const r = await P.learnFromCaptures((await getContext()).today);
  revalidatePath("/", "layout");
  if (!r.ok) return { ok: false, message: r.message };
  const { facts, people } = r.value;
  return { ok: true, message: facts + people ? `تعلّمت ${facts} شي جديد و${people} شخص` : "ما في شي جديد هالمرة" };
}
export async function savePerson(id: string | null, p: Pick<PersonView, "name" | "relation" | "note">) {
  return done(await P.savePerson(id, p));
}
export async function touchPerson(id: string) {
  await P.touchPerson(id, (await getContext()).today);
  return done();
}
export async function removePerson(id: string) {
  await P.removePerson(id);
  return done();
}
