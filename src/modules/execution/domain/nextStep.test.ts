import { describe, expect, it } from "vitest";
import { pickNextStep } from "./nextStep";
import { relativeDay } from "@/shared/kernel/relative";

const t = (id: string, p: Partial<{ status: string; cancelled: boolean; okrRank: number | null; hasGoal: boolean; order: number }> = {}) => ({
  id, status: "NOT_STARTED", cancelled: false, okrRank: null, hasGoal: true, order: 0, ...p,
});

describe("pickNextStep", () => {
  it("أولوية 1 قبل أي شي", () => expect(pickNextStep([t("a", { okrRank: 2 }), t("b", { okrRank: 1 }), t("c")])?.id).toBe("b"));
  it("ضمن نفس الأولوية: الماشية أول", () => expect(pickNextStep([t("a", { okrRank: 1 }), t("b", { okrRank: 1, status: "IN_PROGRESS" })])?.id).toBe("b"));
  it("المربوطة بهدف قبل الروتين", () => expect(pickNextStep([t("r", { hasGoal: false }), t("g")])?.id).toBe("g"));
  it("ما بيختار الخالص ولا الملغى", () => expect(pickNextStep([t("a", { status: "DONE" }), t("b", { cancelled: true })])).toBeNull());
});

describe("relativeDay", () => {
  it("بالعامية", () => {
    expect(relativeDay("2026-11-22", "2026-11-22")).toBe("اليوم");
    expect(relativeDay("2026-11-23", "2026-11-22")).toBe("بكرا");
    expect(relativeDay("2026-11-30", "2026-11-22")).toBe("بعد 8 أيام");
    expect(relativeDay("2026-12-19", "2026-11-22")).toBe("بعد 27 يوم");
  });
});
