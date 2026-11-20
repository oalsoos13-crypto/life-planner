import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { advisorConnected, writeShort } from "@/modules/advisor/server";
import { PURPOSE_LABEL, postProblems, templateMessage, wantsHuman, type Purpose, type WaIncoming } from "../domain/outreach";

const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

// ── واتساب شخصي: مسودة بأسلوبك، وإنت بتبعتها بإيدك ──
const STYLE = `إنت بتكتب رسالة واتساب باسم عمر (29 سنة، أردني عايش بالكويت). اللهجة شامية/أردنية دافية وطبيعية، جمل قصيرة، إيموجي وحدة بالكتير.
رجّع نص الرسالة بس، بدون مقدمة ولا شرح ولا علامات تنصيص. لا تخترع أحداث أو وعود ما ذكرها.`;

export async function draftPersonal(purpose: Purpose, personId: string | null, note: string): Promise<Result<{ text: string; by: "CLAUDE" | "TEMPLATE" }>> {
  const person = personId ? await prisma.person.findUnique({ where: { id: personId } }) : null;
  const fallback = templateMessage(purpose, person?.name ?? null);
  if (!advisorConnected()) return ok({ text: fallback, by: "TEMPLATE" });
  const facts = await prisma.profileFact.findMany({ where: { area: "PREFERENCES", status: "CONFIRMED" }, take: 5, select: { text: true } });
  try {
    const text = await writeShort(
      STYLE + (facts.length ? `\nعن أسلوبه: ${facts.map((f) => f.text).join(" | ")}` : ""),
      `الغرض: ${PURPOSE_LABEL[purpose]}\nلمين: ${person ? [person.name, person.relation, person.note].filter(Boolean).join(" · ") : "مش محدّد"}\nملاحظة من عمر: ${note.trim().slice(0, 500) || "-"}`,
    );
    return ok({ text: text ?? fallback, by: text ? "CLAUDE" : "TEMPLATE" });
  } catch {
    return ok({ text: fallback, by: "TEMPLATE" });
  }
}

// ── منشورات المجدّد عبر Postiz (API رسمي) ──
const postizUrl = () => (process.env.POSTIZ_API_URL || "https://api.postiz.com").replace(/\/$/, "");
export const postizConnected = () => !!process.env.POSTIZ_API_KEY;
const postiz = (path: string, init: RequestInit = {}) =>
  fetch(`${postizUrl()}/public/v1${path}`, { ...init, headers: { Authorization: process.env.POSTIZ_API_KEY!, "content-type": "application/json", ...init.headers }, cache: "no-store" });

export type Channel = { id: string; name: string; identifier: string; picture: string | null };
export async function listChannels(): Promise<Result<Channel[]>> {
  if (!postizConnected()) return err("NO_KEY", "Postiz مش موصول");
  try {
    const r = await postiz("/integrations");
    if (!r.ok) return err("API", `Postiz رجّع ${r.status}`);
    const raw = (await r.json()) as { id: string; name?: string; identifier?: string; providerIdentifier?: string; picture?: string; disabled?: boolean }[];
    return ok(raw.filter((x) => !x.disabled).map((x) => ({ id: x.id, name: x.name ?? x.identifier ?? "منصة", identifier: x.identifier ?? x.providerIdentifier ?? "", picture: x.picture ?? null })));
  } catch (e) {
    return err("API", `ما قدرت أوصل لـ Postiz: ${short(e)}`);
  }
}

export async function schedulePost(content: string, channels: Channel[], when: Date, asDraft: boolean): Promise<Result<void>> {
  const problems = postProblems(content, channels.map((c) => c.identifier), when, new Date());
  if (problems.length) return err("INVALID", problems.join("، "));
  const row = await prisma.socialPost.create({ data: { content: content.trim(), channels, scheduledAt: when, status: "DRAFT" } });
  if (!postizConnected()) return ok(undefined); // بينحفظ مسودة بالتطبيق لحد ما ينوصل
  try {
    const r = await postiz("/posts", {
      method: "POST",
      body: JSON.stringify({ type: asDraft ? "draft" : "schedule", date: when.toISOString(), shortLink: false, tags: [], posts: channels.map((c) => ({ integration: { id: c.id }, value: [{ content: content.trim(), image: [] }] })) }),
    });
    const body = await r.text();
    if (!r.ok) {
      await prisma.socialPost.update({ where: { id: row.id }, data: { status: "FAILED", error: body.slice(0, 300) } });
      return err("API", `Postiz رفض: ${body.slice(0, 160)}`);
    }
    let ext: string | null = null;
    try { const j = JSON.parse(body); ext = (Array.isArray(j) ? j[0]?.postId ?? j[0]?.id : j?.id ?? j?.group) ?? null; } catch {}
    await prisma.socialPost.update({ where: { id: row.id }, data: { status: asDraft ? "DRAFT" : "SCHEDULED", externalId: ext ? String(ext) : null } });
    return ok(undefined);
  } catch (e) {
    await prisma.socialPost.update({ where: { id: row.id }, data: { status: "FAILED", error: short(e) } });
    return err("API", `ما قدرت أوصل لـ Postiz: ${short(e)}`);
  }
}

export async function draftSocial(topic: string): Promise<Result<string>> {
  if (!advisorConnected()) return err("NO_KEY", "الكتابة الذكية بتحتاج مفتاح Claude. اكتبه بإيدك هلّق.");
  const faq = (await prisma.settings.findUnique({ where: { id: 1 }, select: { businessFaq: true } }))?.businessFaq;
  try {
    const t = await writeShort(
      `إنت كاتب محتوى لتطبيق «المجدّد» (تطبيق موبايل لعمر). اكتب منشور سوشال ميديا عربي قصير وجذّاب، بنبرة دافية مش تسويقية مبالغ فيها، مع دعوة واضحة لتنزيل التطبيق من Google Play. 3-5 أسطر، وهاشتاغين بالكتير. رجّع نص المنشور بس.${faq ? `\nمعلومات عن التطبيق:\n${faq.slice(0, 3000)}` : ""}`,
      `الفكرة: ${topic.trim().slice(0, 500)}`,
    );
    return t ? ok(t) : err("REFUSED", "ما قدرت أكتب هالمرة");
  } catch (e) {
    return err("API", short(e));
  }
}

export async function removePost(id: string) {
  await prisma.socialPost.deleteMany({ where: { id } });
}

// ── واتساب بزنس للمجدّد (WhatsApp Cloud API) ──
export const waConnected = () => !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID && process.env.WA_APP_SECRET && process.env.WA_VERIFY_TOKEN);

export function verifyChallenge(mode: string | null, token: string | null): boolean {
  const want = process.env.WA_VERIFY_TOKEN;
  return mode === "subscribe" && !!want && token === want;
}
export function signatureOk(raw: string, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const exp = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return exp.length === got.length && timingSafeEqual(exp, got);
}

async function waSend(to: string, text: string): Promise<boolean> {
  const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WA_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text.slice(0, 4000) } }),
  });
  return r.ok;
}

const BUSINESS = `إنت «مساعد المجدّد» على واتساب: مساعد آلي لتطبيق المجدّد (تطبيق موبايل). عرّف عن حالك إنك المساعد الآلي أول مرة بالمحادثة.
جاوب بالعربي بلهجة العميل، باختصار ولطف، من المعلومات تحت بس. إذا ما بتعرف الجواب أو الموضوع شكوى/دفع/حساب، قول إنك رح توصّل الرسالة لفريق المجدّد وبيردّوا قريباً.
لا تعطي وعود أسعار أو مواعيد مش مكتوبة. لا تطلب كلمات سر أو بيانات بطاقات أبداً.`;

/** رسائل داخلة: بتنحفظ، وبيرد آلياً إذا مفعّل (إلا إذا العميل طلب إنسان) */
export async function handleIncoming(msgs: WaIncoming[]): Promise<void> {
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { businessFaq: true, waAutoReply: true } });
  for (const m of msgs) {
    const exists = await prisma.waMessage.findUnique({ where: { waId: m.waId } });
    if (exists) continue; // Meta بتعيد الإرسال أحياناً
    await prisma.waMessage.create({ data: { waId: m.waId, peer: m.from, direction: "IN", text: m.text } });
    if (!s?.waAutoReply || !advisorConnected() || wantsHuman(m.text)) continue;
    const history = await prisma.waMessage.findMany({ where: { peer: m.from }, orderBy: { createdAt: "desc" }, take: 8 });
    try {
      const reply = await writeShort(
        `${BUSINESS}\n\nمعلومات المجدّد:\n${s.businessFaq?.slice(0, 6000) || "لسا ما في معلومات مكتوبة. قول إنك رح توصّل السؤال للفريق."}`,
        history.reverse().map((h) => `${h.direction === "IN" ? "العميل" : "المساعد"}: ${h.text}`).join("\n"),
      );
      if (reply && (await waSend(m.from, reply))) await prisma.waMessage.create({ data: { peer: m.from, direction: "OUT", text: reply, auto: true } });
    } catch {
      // الرسالة محفوظة، وعمر بيشوفها وبيرد بإيده
    }
  }
}

export async function replyManually(peer: string, text: string): Promise<Result<void>> {
  if (!waConnected()) return err("NO_KEY", "واتساب بزنس مش موصول");
  const t = text.trim();
  if (!t) return err("EMPTY", "اكتب الرد");
  try {
    if (!(await waSend(peer, t))) return err("API", "واتساب رفض. إذا مرّ أكتر من 24 ساعة على آخر رسالة من العميل، لازم قالب معتمد.");
  } catch (e) {
    return err("API", short(e));
  }
  await prisma.waMessage.create({ data: { peer, direction: "OUT", text: t } });
  return ok(undefined);
}

export async function saveBusiness(faq: string, auto: boolean) {
  await prisma.settings.update({ where: { id: 1 }, data: { businessFaq: faq.trim().slice(0, 8000) || null, waAutoReply: auto } });
}
