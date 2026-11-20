import { describe, expect, it } from "vitest";
import { countDoubleMisses, deriveFacts, knowScore, type ProfileInput } from "./profile";

const empty: ProfileInput = { days: [], habits: [], tasks: [], expenses: [] };

describe("deriveFacts", () => {
  it("ما بيستنتج شي من بيانات قليلة", () => {
    expect(deriveFacts(empty)).toEqual([]);
    expect(deriveFacts({ ...empty, days: [{ weekday: 5, energy: 5, mood: null }] })).toEqual([]);
  });

  it("بيلاقي أعلى وأوطى يوم طاقة", () => {
    const days = [5, 5, 5, 1, 1, 1].map((weekday, i) => ({ weekday, energy: weekday === 5 ? 5 : 2, mood: null, i }));
    const f = deriveFacts({ ...empty, days }).find((x) => x.key === "energy:weekday");
    expect(f?.text).toContain("الجمعة");
    expect(f?.text).toContain("الإثنين");
  });

  it("ما بيحكي عن فرق طاقة صغير", () => {
    const days = [5, 5, 5, 1, 1, 1].map((weekday) => ({ weekday, energy: weekday === 5 ? 4 : 3.5, mood: null }));
    expect(deriveFacts({ ...empty, days }).find((x) => x.key === "energy:weekday")).toBeUndefined();
  });

  it("العادة القوية والضعيفة و«ما تفوّت مرتين»", () => {
    const f = deriveFacts({
      ...empty,
      habits: [
        { name: "مشي", doneDays: 20, possibleDays: 25, misses2: 0 },
        { name: "قراءة", doneDays: 4, possibleDays: 25, misses2: 3 },
      ],
    });
    expect(f.find((x) => x.key === "habits:best")?.text).toContain("مشي");
    expect(f.find((x) => x.key === "habits:weak")?.text).toContain("قراءة");
    expect(f.find((x) => x.key === "habits:miss2")?.text).toContain("قراءة");
  });

  it("التأجيل حسب المحور", () => {
    const t = (pillar: string, carryCount: number) => ({ pillar, carryCount, stuck: false, done: false, doneWeekday: null });
    const f = deriveFacts({ ...empty, tasks: [t("المجدّد", 2), t("المجدّد", 3), t("الصحة", 2)] });
    expect(f.find((x) => x.key === "procrastination:pillar")?.text).toContain("المجدّد");
  });

  it("المصاري: الفئة المسيطرة بس إذا ≥30%", () => {
    const e = (category: string, amount: number) => ({ category, amount });
    const f = deriveFacts({ ...empty, expenses: [e("أكل", 10), e("أكل", 8), e("مواصلات", 2), e("بيت", 3), e("أكل", 5)] });
    expect(f.find((x) => x.key === "money:top")?.text).toContain("أكل");
    expect(f.every((x) => x.confidence >= 0.3 && x.confidence <= 0.95)).toBe(true);
  });
});

describe("knowScore", () => {
  const zero = { values: 0, compassDone: 0, energyDays: 0, habitDays: 0, captures: 0, confirmed: 0, pending: 0, people: 0, expenses: 0 };
  it("صفر بالبداية، والخطوة الجاية أكبر فجوة", () => {
    const k = knowScore(zero);
    expect(k.score).toBe(0);
    expect(k.next?.key).toBe("values");
  });
  it("100 لما كل شي مغطّى، وما بيطلع فوق", () => {
    const k = knowScore({ values: 9, compassDone: 10, energyDays: 99, habitDays: 99, captures: 999, confirmed: 50, pending: 0, people: 20, expenses: 99 });
    expect(k.score).toBe(100);
    expect(k.next).toBeNull();
    expect(k.parts.reduce((a, p) => a + p.max, 0)).toBe(100);
  });
});

describe("countDoubleMisses", () => {
  it("بيعدّ كل انقطاع يومين مرة وحدة", () => {
    const days = ["1", "2", "3", "4", "5", "6", "7"];
    expect(countDoubleMisses(new Set(["1", "4", "7"]), days)).toBe(2);
    expect(countDoubleMisses(new Set(["1", "2"]), days)).toBe(1);
  });
});
