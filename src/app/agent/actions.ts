"use server";
import { revalidatePath } from "next/cache";
import { agentUseCases as A, type JobInput } from "@/modules/agent/server";
import type { UserAction } from "@/modules/agent";

type R = { ok: true } | { ok: false; message: string };
const done = (r?: { ok: boolean; message?: string }): R => {
  revalidatePath("/", "layout");
  return r && !r.ok ? { ok: false, message: r.message ?? "صار خطأ" } : { ok: true };
};
export async function createJob(i: JobInput) {
  return done(await A.createJob(i));
}
export async function actOnJob(id: string, a: UserAction) {
  return done(await A.act(id, a));
}
export async function setStanding(id: string, v: boolean) {
  return done(await A.setStanding(id, v));
}
export async function removeJob(id: string) {
  await A.removeJob(id);
  return done();
}
