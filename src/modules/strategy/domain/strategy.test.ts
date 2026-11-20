import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canAddKeyResult, isOkrSuccess, looksLikeTask, nextOkrRank, okrScore, scoreBand } from "./okr";
import { auditStrategy, type StrategySnapshot } from "./audit";
import { validateChallenge } from "./kernel";
import { progress } from "@/shared/kernel/metricTarget";

describe("nextOkrRank", () => {
  it("بيعطي أول رتبة فاضية", () => expect(nextOkrRank([1, 3])).toEqual({ ok: true, value: 2 }));
  it("بيرفض الرابع بلغة المنهجية", () => {
    const r = nextOkrRank([1, 2, 3]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("شو بدك تشيل");
  });
});

describe("isOkrSuccess", () => {
  it("الطموح 0.7 نجاح", () => expect(isOkrSuccess(0.7, "ASPIRATIONAL")).toBe(true));
  it("الملتزم 0.9 مش نجاح", () => expect(isOkrSuccess(0.9, "COMMITTED")).toBe(false));
});

describe("canAddKeyResult", () => {
  it("لحد 5", () => {
    expect(canAddKeyResult(4).ok).toBe(true);
    expect(canAddKeyResult(5).ok).toBe(false);
  });
});

describe("progress (Strategy حسب الاتجاه)", () => {
  it("طالع", () => expect(progress({ start: 0, target: 1000, direction: "UP" }, 300)).toBe(0.3));
  it("نازل: الدين من 500 لـ 250", () => expect(progress({ start: 500, target: 250, direction: "DOWN" }, 400)).toBe(0.4));
  it("ناقص بيانات = null", () => expect(progress({ start: null, target: 5, direction: "DOWN" }, 3)).toBeNull());
  it("خاصية: دايماً بين 0 و1", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), fc.double({ noNaN: true, min: -1e6, max: 1e6 }), fc.double({ noNaN: true, min: -1e6, max: 1e6 }), fc.constantFrom("UP" as const, "DOWN" as const), (s, t, v, d) => {
        const p = progress({ start: s, target: t, direction: d }, v);
        return p === null || (p >= 0 && p <= 1);
      })
    );
  });
});

describe("okrScore", () => {
  it("متوسط النتائج القابلة للقياس", () => {
    expect(
      okrScore([
        { start: 0, target: 1000, direction: "UP", latest: 500 },
        { start: 0, target: 20, direction: "UP", latest: 0 },
        { start: null, target: null, direction: "UP", latest: null },
      ])
    ).toBe(0.25);
  });
  it("بدون قراءات = تقدم البداية (0)", () => expect(okrScore([{ start: 0, target: 10, direction: "UP", latest: null }])).toBe(0));
  it("scoreBand", () => expect([scoreBand(null), scoreBand(0.2), scoreBand(0.5), scoreBand(0.7)]).toEqual(["none", "low", "mid", "high"]));
});

describe("looksLikeTask", () => {
  it("بدون رقم هدف = مهمة", () => expect(looksLikeTask({ name: "صفحة المتجر", target: null })).toBe(true));
  it("بتبلّش بفعل = مهمة", () => expect(looksLikeTask({ name: "أطلق صفحة المتجر", target: 1 })).toBe(true));
  it("رقم = نتيجة", () => expect(looksLikeTask({ name: "مستخدمون نشطون", target: 1000 })).toBe(false));
});

describe("validateChallenge", () => {
  it("فاضي مرفوض", () => expect(validateChallenge("  ").ok).toBe(false));
  it("أطول من 200 مرفوض", () => expect(validateChallenge("أ".repeat(201)).ok).toBe(false));
  it("بينظّف المسافات", () => expect(validateChallenge(" وقتي   محصور ")).toEqual({ ok: true, value: "وقتي محصور" }));
});

describe("auditStrategy", () => {
  const good: StrategySnapshot = {
    kernel: { coreChallenge: "x", guidingPolicy: "y", essentialIntent: "z", freeHours: 14 },
    strategicGoals: (["FINANCE", "IMPACT", "SYSTEM", "GROWTH"] as const).map((p, i) => ({ id: String(i), title: p, perspective: p, metricCount: 1 })),
    okrs: [{ id: "o", title: "O1", strategicGoalId: "1", weeklyHours: 6, krs: [1, 2, 3].map((n) => ({ name: `KR${n}`, target: n })) }],
    notDoingCount: 2,
  };
  it("استراتيجية سليمة = ولا تنبيه", () => expect(auditStrategy(good)).toEqual([]));
  it("بيمسك كل البنود", () => {
    const codes = auditStrategy({
      kernel: { coreChallenge: "", guidingPolicy: null, essentialIntent: null, freeHours: 10 },
      strategicGoals: [{ id: "1", title: "a", perspective: "FINANCE", metricCount: 0 }],
      okrs: [1, 2, 3, 4].map((n) => ({ id: String(n), title: `O${n}`, strategicGoalId: null, weeklyHours: 3, krs: [{ name: "اعمل صفحة", target: 1 }, { name: "الوزن", target: null }] })),
      notDoingCount: 0,
    }).map((w) => w.code);
    for (const c of ["EMPTY_CHALLENGE", "EMPTY_POLICY", "TOO_MANY_OKRS", "OKR_UNLINKED", "KR_AS_TASK", "KR_NO_TARGET", "FEW_KRS", "SG_COUNT", "SG_NO_METRIC", "EMPTY_PERSPECTIVE", "NO_NOT_DOING", "TIME_OVERFLOW"])
      expect(codes).toContain(c);
  });
  it("ميزانية الوقت بهامش 50%: 6 ساعات × 1.5 = 9 ≤ 10 تمام، 7 × 1.5 > 10", () => {
    const at = (h: number, free: number) => auditStrategy({ ...good, kernel: { ...good.kernel, freeHours: free }, okrs: [{ ...good.okrs[0], weeklyHours: h }] }).map((w) => w.code);
    expect(at(6, 10)).not.toContain("TIME_OVERFLOW");
    expect(at(7, 10)).toContain("TIME_OVERFLOW");
  });
});
