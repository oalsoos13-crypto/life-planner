import { describe, expect, it } from "vitest";
import { chainFor, ruleExtract, sanitize, type CaptureContext, type Extracted } from "./capture";

const ctx: CaptureContext = {
  today: "2026-11-20",
  habits: [
    { id: "h1", name: "مشي 10 دقائق", pillar: "الصحة" },
    { id: "h2", name: "الورد", pillar: "الروحانيات" },
  ],
  goals: [{ id: "g1", title: "إطلاق المجدّد", pillar: "«المجدّد»", rank: 1, strategicGoal: "قاعدة مستخدمين مخلصين", metrics: [{ id: "m1", name: "مستخدمين نشطين", unit: null, latest: 120 }] }],
  essentialIntent: null,
};
const base: Extracted = { kind: "NOTE", title: "x", goalId: null, habitId: null, metricId: null, value: null, amount: null, category: null };

describe("ruleExtract", () => {
  it("بيمسك المصروف والعادة والمهمة", () => {
    const r = ruleExtract("مشيت نص ساعة، المدير طلب تقرير المبيعات لبكرة، دفعت 12 دينار غدا", ctx);
    expect(r.map((x) => x.kind)).toEqual(["HABIT", "TASK", "EXPENSE"]);
    expect(r[2].amount).toBe(12);
    expect(r[2].category).toBe("أكل");
  });
  it("«فكرة:» بتضل فكرة حتى لو فيها اسم عادة", () => {
    const r = ruleExtract("فكرة: المجدّد لازم يذكّر بالورد", ctx);
    expect(r[0].kind).toBe("NOTE");
  });
  it("النفي ما بيعلّم العادة", () => {
    expect(ruleExtract("ما مشيت اليوم", ctx)[0].kind).toBe("NOTE");
  });
});

describe("sanitize", () => {
  it("بيرمي المعرّفات المخترعة وبينزّل النوع لفكرة", () => {
    const r = sanitize([{ ...base, kind: "HABIT", habitId: "nope", title: "مشي" }, { ...base, kind: "METRIC", metricId: "m1", value: 130, title: "130 مستخدم" }], ctx);
    expect(r[0].kind).toBe("NOTE");
    expect(r[1].kind).toBe("METRIC");
  });
  it("الطاقة لازم بين 1 و5", () => {
    expect(sanitize([{ ...base, kind: "ENERGY", value: 9, title: "طاقة" }], ctx)[0].kind).toBe("NOTE");
    expect(sanitize([{ ...base, kind: "ENERGY", value: 4.4, title: "طاقة" }], ctx)[0].value).toBe(4);
  });
});

describe("chainFor", () => {
  it("المؤشر بيوصل للأولوية والهدف الاستراتيجي", () => {
    expect(chainFor({ ...base, kind: "METRIC", metricId: "m1", value: 130 }, ctx)).toBe("مستخدمين نشطين ← أولوية ١: إطلاق المجدّد ← قاعدة مستخدمين مخلصين");
  });
  it("العادة بتوصل لمحورها", () => {
    expect(chainFor({ ...base, kind: "HABIT", habitId: "h1" }, ctx)).toBe("مشي 10 دقائق ← الصحة");
  });
});
