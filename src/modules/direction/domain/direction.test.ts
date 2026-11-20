import { describe, expect, it } from "vitest";
import { compassStatus, identityShape, principleShape } from "./compass";
import { decisionGaps, ninetyRule, reviewDue } from "./decision";
import { wheelStats } from "../../diagnosis/domain/wheel";

const empty = { bhag: null, picture3y: null, mission: null, winning: null, why: null, eulogy: null, enough: null };

describe("البوصلة", () => {
  it("الخطوة الأولى تمرين التأبين", () => {
    expect(compassStatus(empty, { VALUE: 0, PRINCIPLE: 0, IDENTITY: 0 })).toMatchObject({ done: 0, total: 10 });
    expect(compassStatus(empty, { VALUE: 0, PRINCIPLE: 0, IDENTITY: 0 }).next).toContain("التأبين");
  });
  it("شكل المبدأ", () => {
    expect(principleShape("لما أتعصّب، بعمل مشي 10 دقايق، لأنه القرار بالغضب بيخرب").ok).toBe(true);
    expect(principleShape("الصبر مهم").ok).toBe(false);
  });
  it("جملة الهوية", () => {
    expect(identityShape("بيمشي كل يوم")).toBe("أنا شخص بيمشي كل يوم");
  });
});

describe("القرارات", () => {
  it("قاعدة 90%", () => {
    expect(ninetyRule([{ text: "أ", score: 7 }, { text: "ب", score: 8 }]).verdict).toBe("NO");
    expect(ninetyRule([{ text: "أ", score: 9 }]).verdict).toBe("YES");
    expect(ninetyRule([{ text: "أ", score: null }]).verdict).toBe("UNSCORED");
  });
  it("الثغرات", () => {
    const g = decisionGaps({ options: [{ text: "أ", score: 5 }], premortem: null, biases: [], reviewAt: null, chosen: null, why: null });
    expect(g.length).toBe(4);
  });
  it("موعد المراجعة", () => {
    expect(reviewDue("2026-11-20", "DECIDED", "2026-11-20")).toBe(true);
    expect(reviewDue("2026-11-21", "DECIDED", "2026-11-20")).toBe(false);
  });
});

describe("لوحة الحياة", () => {
  it("المعدّل والأضعف", () => {
    const s = wheelStats([{ pillarId: "a", name: "الصحة", score: 4 }, { pillarId: "b", name: "المال", score: 8 }, { pillarId: "c", name: "التعلّم", score: null }]);
    expect(s).toMatchObject({ avg: 6, lowest: ["الصحة"], spread: 4, rated: 2 });
  });
});
