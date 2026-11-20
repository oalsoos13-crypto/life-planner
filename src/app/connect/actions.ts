"use server";
import { revalidatePath } from "next/cache";
import { outreachUseCases as O, type Channel } from "@/modules/outreach/server";
import type { Purpose } from "@/modules/outreach";

type R<T = undefined> = { ok: true; value?: T } | { ok: false; message: string };
const wrap = <T,>(r: { ok: true; value: T } | { ok: false; message: string }): R<T> => (r.ok ? { ok: true, value: r.value } : { ok: false, message: r.message });

export async function draftPersonal(purpose: Purpose, personId: string | null, note: string) {
  return wrap(await O.draftPersonal(purpose, personId, note));
}
export async function draftSocial(topic: string) {
  return wrap(await O.draftSocial(topic));
}
export async function channels() {
  return wrap(await O.listChannels());
}
export async function schedulePost(content: string, chans: Channel[], whenIso: string, asDraft: boolean) {
  const r = await O.schedulePost(content, chans, new Date(whenIso), asDraft);
  revalidatePath("/connect");
  return wrap(r);
}
export async function removePost(id: string) {
  await O.removePost(id);
  revalidatePath("/connect");
  return { ok: true } as const;
}
export async function replyWa(peer: string, text: string) {
  const r = await O.replyManually(peer, text);
  revalidatePath("/connect");
  return wrap(r);
}
export async function saveBusiness(faq: string, auto: boolean) {
  await O.saveBusiness(faq, auto);
  revalidatePath("/connect");
  return { ok: true } as const;
}
