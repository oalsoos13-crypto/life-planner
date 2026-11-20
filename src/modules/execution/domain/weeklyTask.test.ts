import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { clampProgress, isEditableWeek, isOverdue, statusAfterStep, statusPatch, weekStats, wipWarning } from "./weeklyTask";
import { normalizeWeekDay, recurrenceCollisions, remapWeekStart } from "./weekStart";

const now = new Date("2026-11-25T10:00:00Z");

describe("isEditableWeek", () => {
  it("الماضي والحالي والجاي بس", () => {
    expect(isEditableWeek("2026-11-15", "2026-11-22")).toBe(true);
    expect(isEditableWeek("2026-11-22", "2026-11-22")).toBe(true);
    expect(isEditableWeek("2026-11-29", "2026-11-22")).toBe(true);
    expect(isEditableWeek("2026-11-08", "2026-11-22")).toBe(false);
    expect(isEditableWeek("2026-12-06", "2026-11-22")).toBe(false);
  });
});

describe("statusPatch (State)", () => {
  it("خلصت: بتشيل «عالقة» والنسبة 100", () => {
    expect(statusPatch("DONE", now)).toMatchObject({ status: "DONE", completedAt: now, stuck: false, progress: 100 });
  });
  it("ماشية: ما بتلمس العالقة", () => {
    const p = statusPatch("IN_PROGRESS", now);
    expect(p.completedAt).toBeNull();
    expect("stuck" in p).toBe(false);
  });
});

describe("statusAfterStep", () => {
  it("أول خطوة بتخلّيها ماشية", () => expect(statusAfterStep("NOT_STARTED", true)).toBe("IN_PROGRESS"));
  it("ما بترجّع الخالصة", () => expect(statusAfterStep("DONE", true)).toBe("DONE"));
  it("فك خطوة ما بيغيّر", () => expect(statusAfterStep("NOT_STARTED", false)).toBe("NOT_STARTED"));
});

describe("weekStats / isOverdue", () => {
  const base = { cancelledAt: null, stuck: false, weekStart: "2026-11-15" };
  it("المتأخر = مش خالص وأسبوعه خلص", () => {
    expect(isOverdue({ ...base, status: "IN_PROGRESS" }, "2026-11-22")).toBe(true);
    expect(isOverdue({ ...base, status: "DONE" }, "2026-11-22")).toBe(false);
    expect(isOverdue({ ...base, status: "IN_PROGRESS" }, "2026-11-21")).toBe(false);
  });
  it("الملغى ما بينحسب", () => {
    const s = weekStats([{ ...base, status: "DONE" }, { ...base, status: "NOT_STARTED", cancelledAt: now }], "2026-11-16");
    expect(s).toMatchObject({ total: 1, done: 1, cancelled: 1, pct: 100 });
  });
  it("ما في مهام = نسبة null مش 0", () => expect(weekStats([], "2026-11-16").pct).toBeNull());
  it("خاصية: النسبة دايماً 0..100", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("NOT_STARTED", "IN_PROGRESS", "DONE")), (sts) => {
        const p = weekStats(sts.map((status) => ({ ...base, status })), "2026-11-16").pct;
        return p === null || (p >= 0 && p <= 100);
      })
    );
  });
});

describe("wipWarning", () => {
  const t = (status: string, goalId: string | null = "g") => ({ status, goalId, cancelledAt: null });
  it("3 ماشية تمام، 4 تنبيه", () => {
    expect(wipWarning([t("IN_PROGRESS"), t("IN_PROGRESS"), t("IN_PROGRESS")])).toBeNull();
    expect(wipWarning([t("IN_PROGRESS"), t("IN_PROGRESS"), t("IN_PROGRESS"), t("IN_PROGRESS")])).toEqual({ count: 4, limit: 3 });
  });
  it("الروتين ما بينحسب", () => expect(wipWarning([1, 2, 3, 4].map(() => t("IN_PROGRESS", null)))).toBeNull());
});

describe("weekStart", () => {
  it("بيحرّك الأحد للسبت الي قبله", () => expect(remapWeekStart("2026-11-22", 6)).toBe("2026-11-21"));
  it("بيرفض مش رقم", () => expect(() => normalizeWeekDay(NaN)).toThrow());
  it("بيحذف النسخة التلقائية المكررة ويخلّي الي لمستها", () => {
    const drop = recurrenceCollisions([
      { id: "auto", recurrenceId: "r", newWeek: "2026-11-21", isAuto: true, touched: false },
      { id: "mine", recurrenceId: "r", newWeek: "2026-11-21", isAuto: false, touched: true },
    ]);
    expect(drop).toEqual(["auto"]);
  });
  it("clampProgress", () => expect([clampProgress(-5), clampProgress(55.6), clampProgress(130)]).toEqual([0, 56, 100]));
});

import { groupWeek, holdStatus, tapStatus } from "./weeklyTask";
describe("groupWeek / tap / hold", () => {
  it("كل مهمة بمجموعة وحدة", () => {
    const g = groupWeek([
      { id: 1, status: "IN_PROGRESS", cancelled: false },
      { id: 2, status: "NOT_STARTED", cancelled: false },
      { id: 3, status: "DONE", cancelled: false },
      { id: 4, status: "DONE", cancelled: true },
    ]);
    expect([g.inProgress, g.todo, g.done, g.cancelled].map((x) => x.map((t) => t.id))).toEqual([[1], [2], [3], [4]]);
  });
  it("الكبسة بتخلّص وبترجّع", () => expect([tapStatus("NOT_STARTED"), tapStatus("IN_PROGRESS"), tapStatus("DONE")]).toEqual(["DONE", "DONE", "NOT_STARTED"]));
  it("المطوّلة بتبدّل ماشية", () => expect([holdStatus("NOT_STARTED"), holdStatus("IN_PROGRESS")]).toEqual(["IN_PROGRESS", "NOT_STARTED"]));
});
