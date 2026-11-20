import { describe, expect, it } from "vitest";
import { blocksForDay, clampScale, cleanIntent, DEFAULT_BLOCKS, fmtMinute, greeting, hijriLabel, missedTwiceRisk, nextRamadan, nowInDay, parseBlocks, streak } from "./day";

describe("اليوم", () => {
  it("بيقرأ الدوام بأمان وبيرجع للافتراضي إذا خربان", () => {
    expect(parseBlocks(null)).toEqual(DEFAULT_BLOCKS);
    expect(parseBlocks([{ label: "x", start: 10, end: 5, kind: "WORK" }])).toEqual(DEFAULT_BLOCKS);
    expect(parseBlocks([{ label: "b", start: 600, end: 700, kind: "WORK" }, { label: "a", start: 60, end: 120, kind: "FREE" }]).map((b) => b.label)).toEqual(["a", "b"]);
  });

  it("الجمعة والسبت بدون بيبسي", () => {
    expect(blocksForDay(DEFAULT_BLOCKS, 5).map((b) => b.label)).toEqual(["الكافيه"]);
    expect(blocksForDay(DEFAULT_BLOCKS, 0)).toHaveLength(2);
  });

  it("بيعرف وين إنت وشو الفترة الفاضية الجاية", () => {
    const r = nowInDay(DEFAULT_BLOCKS, 10 * 60);
    expect(r.current?.label).toBe("بيبسي");
    expect(r.nextFree).toEqual({ start: 960, end: 1020 });
    expect(nowInDay(DEFAULT_BLOCKS, 7 * 60).nextFree).toEqual({ start: 420, end: 480 });
    expect(nowInDay(DEFAULT_BLOCKS, 21 * 60).nextFree).toEqual({ start: 1320, end: 1440 });
  });

  it("الساعة والتحية", () => {
    expect(fmtMinute(17 * 60 + 20)).toBe("5:20م");
    expect(fmtMinute(0)).toBe("12ص");
    expect(greeting(9)).toBe("صباح الخير");
    expect(greeting(17)).toBe("مسا الخير");
  });

  it("الهجري ورمضان (أم القرى)", () => {
    expect(hijriLabel("2026-11-20")).toBe("10 جمادى الآخرة 1448");
    expect(nextRamadan("2026-11-20")).toBe("2027-02-08");
    expect(nextRamadan("2027-02-15")).toBe("2027-02-08");
  });

  it("سلسلة العادة و«ما تفوّت مرتين»", () => {
    const s = new Set(["2026-11-18", "2026-11-19"]);
    expect(streak(s, "2026-11-20")).toBe(2);
    expect(streak(new Set([...s, "2026-11-20"]), "2026-11-20")).toBe(3);
    expect(streak(s, "2026-11-22")).toBe(0);
    expect(missedTwiceRisk(s, "2026-11-20")).toBe(false);
    expect(missedTwiceRisk(s, "2026-11-21")).toBe(true);
    expect(missedTwiceRisk(s, "2026-11-22")).toBe(true);
    expect(missedTwiceRisk(new Set(), "2026-11-22")).toBe(false);
  });

  it("النية والمقاييس", () => {
    expect(cleanIntent("  أخلّص   الصفحة ")).toBe("أخلّص الصفحة");
    expect(cleanIntent("   ")).toBeNull();
    expect(cleanIntent("x".repeat(300))).toHaveLength(140);
    expect(clampScale(7)).toBe(5);
    expect(clampScale(0)).toBe(1);
    expect(clampScale(null)).toBeNull();
  });
});
