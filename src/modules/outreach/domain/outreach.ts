// التواصل: واتساب شخصي (مسودات بس)، منشورات المجدّد، وواتساب بزنس. دوال نقية (ADR-002).
// الواتساب الشخصي ما في فيه أتمتة أبداً (خطر الحظر): التطبيق بيكتب المسودة، وإنت بتكبس إرسال بإيدك.

export const PURPOSES = ["CHECKIN", "CONGRATS", "APOLOGY", "FOLLOWUP", "THANKS"] as const;
export type Purpose = (typeof PURPOSES)[number];
export const PURPOSE_LABEL: Record<Purpose, string> = { CHECKIN: "اطمئنان", CONGRATS: "تهنئة", APOLOGY: "اعتذار", FOLLOWUP: "متابعة", THANKS: "شكر" };

/** مسودات جاهزة بلهجتك لما ما يكون في مفتاح Claude */
export function templateMessage(purpose: Purpose, name: string | null): string {
  const n = name?.trim() ? ` ${name.trim()}` : "";
  switch (purpose) {
    case "CHECKIN": return `مرحبا${n}، كيفك؟ اشتقتلك والله، طمّني عنك وعن أخبارك 🌙`;
    case "CONGRATS": return `ألف مبروك${n}! تستاهل كل خير، الله يتمّملك على خير ويوفقك 🎉`;
    case "APOLOGY": return `${n ? `${n.trim()}، ` : ""}بعتذر منك بجد، كان لازم أتصرّف أحسن. بتمنى تسامحني، وإذا بتحب نحكي فيها أنا جاهز.`;
    case "FOLLOWUP": return `مرحبا${n}، حبيت أتابع معك بخصوص الموضوع الي حكينا فيه. في أي جديد من طرفك؟`;
    case "THANKS": return `${n ? `${n.trim()}، ` : ""}شكراً من القلب على وقفتك، ما بنساها 🙏`;
  }
}

/** رابط واتساب بيفتح المسودة جاهزة. بدون رقم بيخلّيك تختار الشخص من واتساب (ما منخزّن أرقام أهلك وصحابك) */
export function waLink(text: string, phone?: string | null): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** حدود الطول لكل منصة (بالأحرف) */
const LIMITS: Record<string, number> = { x: 280, twitter: 280, bluesky: 300, threads: 500, mastodon: 500, "linkedin-page": 3000, linkedin: 3000, instagram: 2200, "instagram-standalone": 2200, facebook: 63206, tiktok: 2200 };
export const limitFor = (identifier: string) => LIMITS[identifier.toLowerCase()] ?? 5000;

export function postProblems(content: string, identifiers: string[], when: Date, now: Date): string[] {
  const out: string[] = [];
  const len = [...content.trim()].length;
  if (!len) out.push("اكتب المنشور");
  if (!identifiers.length) out.push("اختار منصة وحدة على الأقل");
  for (const id of identifiers) if (len > limitFor(id)) out.push(`طويل على ${id}: ${len} من ${limitFor(id)}`);
  if (when.getTime() < now.getTime() - 60_000) out.push("الوقت راح، اختار وقت جاي");
  return out;
}

/** أحسن أوقات النشر لجمهور خليجي (تقريبية، وبتتعدّل حسب أرقامك): 1 الظهر و9 المسا بتوقيت الكويت */
export function suggestSlots(now: Date, count = 3): Date[] {
  const slots: Date[] = [];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let i = 0; slots.length < count && i < 14; i++) {
    for (const h of [10, 18]) { // 13:00 و21:00 الكويت = 10:00 و18:00 UTC
      const s = new Date(d.getTime() + i * 864e5 + h * 3600e3);
      if (s.getTime() > now.getTime() + 30 * 60e3 && slots.length < count) slots.push(s);
    }
  }
  return slots;
}

// ── واتساب بزنس ──
export type WaIncoming = { waId: string; from: string; text: string };

/** بيطلّع الرسائل النصية من webhook تبع Meta. أي شي تاني (صور، حالات توصيل) بينتجاهل */
export function parseWaWebhook(body: unknown): WaIncoming[] {
  const out: WaIncoming[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    const changes = (e as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const c of changes) {
      const msgs = (c as { value?: { messages?: unknown[] } })?.value?.messages;
      if (!Array.isArray(msgs)) continue;
      for (const m of msgs) {
        const x = m as { id?: string; from?: string; type?: string; text?: { body?: string } };
        if (x.type === "text" && x.id && x.from && x.text?.body) out.push({ waId: x.id, from: x.from, text: x.text.body.slice(0, 4000) });
      }
    }
  }
  return out;
}

/** لما العميل بدّه إنسان، ما منرد آلياً */
export const wantsHuman = (t: string) => /(بدي|ابغى|أبغى|بدّي|اريد|أريد).{0,12}(احكي|أكلم|اكلم|موظف|شخص|إنسان|انسان|عمر)|\bhuman\b|\bagent\b/i.test(t);

/** رقم العميل مخفي بالواجهة: آخر 4 أرقام بس */
export const maskPhone = (p: string) => (p.length > 4 ? `••• ${p.slice(-4)}` : p);
