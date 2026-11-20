import { describe, expect, it } from "vitest";
import { maskPhone, parseWaWebhook, postProblems, suggestSlots, templateMessage, waLink, wantsHuman } from "./outreach";

describe("واتساب شخصي", () => {
  it("رابط بدون رقم بيخليك تختار الشخص", () => {
    expect(waLink("مرحبا كيفك")).toBe("https://wa.me/?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20%D9%83%D9%8A%D9%81%D9%83");
    expect(waLink("hi", "+965 1234-5678")).toBe("https://wa.me/96512345678?text=hi");
  });
  it("القوالب فيها الاسم", () => {
    expect(templateMessage("CHECKIN", "خالد")).toContain("خالد");
    expect(templateMessage("THANKS", null)).not.toContain("null");
  });
});

describe("منشورات", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("طول X", () => {
    expect(postProblems("ا".repeat(281), ["x"], new Date("2026-11-21T10:00:00Z"), now)[0]).toContain("x");
    expect(postProblems("قصير", ["x", "instagram"], new Date("2026-11-21T10:00:00Z"), now)).toEqual([]);
  });
  it("وقت فات ومنصة ناقصة", () => {
    expect(postProblems("x", [], new Date("2026-11-19T10:00:00Z"), now)).toHaveLength(2);
  });
  it("أوقات مقترحة بالمستقبل", () => {
    const s = suggestSlots(now);
    expect(s).toHaveLength(3);
    expect(s.every((d) => d > now)).toBe(true);
    expect(s[0].toISOString()).toBe("2026-11-20T18:00:00.000Z");
  });
});

describe("واتساب بزنس", () => {
  it("بيطلّع الرسائل النصية بس", () => {
    const body = { entry: [{ changes: [{ value: { messages: [
      { id: "w1", from: "96550000000", type: "text", text: { body: "قديش الاشتراك؟" } },
      { id: "w2", from: "96550000000", type: "image" },
    ], statuses: [{ id: "s" }] } }] }] };
    expect(parseWaWebhook(body)).toEqual([{ waId: "w1", from: "96550000000", text: "قديش الاشتراك؟" }]);
    expect(parseWaWebhook(null)).toEqual([]);
    expect(parseWaWebhook({ entry: "x" })).toEqual([]);
  });
  it("طلب إنسان", () => {
    expect(wantsHuman("بدي احكي مع موظف")).toBe(true);
    expect(wantsHuman("كيف بشترك؟")).toBe(false);
  });
  it("إخفاء الرقم", () => expect(maskPhone("96550001234")).toBe("••• 1234"));
});
