import { describe, expect, it } from "vitest";
import { agentOnline, nextWeekly, onClaim, onReport, onUser, safeSummary, standingAllowed } from "./job";

describe("دورة المهمة", () => {
  it("التحضير ← موافقة ← إرسال ← خلص", () => {
    expect(onClaim("QUEUED")).toBe("RUNNING");
    expect(onReport("RUNNING", "READY_FOR_APPROVAL", false)).toBe("NEEDS_APPROVAL");
    expect(onUser("NEEDS_APPROVAL", "APPROVE")).toBe("APPROVED");
    expect(onClaim("APPROVED")).toBe("SENDING");
    expect(onReport("SENDING", "DONE", false)).toBe("DONE");
  });
  it("ما في إرسال بدون موافقة، إلا بإذن دائم", () => {
    expect(onClaim("NEEDS_APPROVAL")).toBeNull();
    expect(onReport("RUNNING", "READY_FOR_APPROVAL", true)).toBe("APPROVED");
    expect(onReport("SENDING", "READY_FOR_APPROVAL", true)).toBeNull();
  });
  it("حالات ممنوعة", () => {
    expect(onUser("RUNNING", "APPROVE")).toBeNull();
    expect(onUser("DONE", "CANCEL")).toBeNull();
    expect(onReport("DONE", "DONE", false)).toBeNull();
    expect(onUser("FAILED", "RETRY")).toBe("QUEUED");
  });
  it("الإذن الدائم بس لتقرير متكرّر", () => {
    expect(standingAllowed("EXCEL_REPORT", 0)).toBe(true);
    expect(standingAllowed("EXCEL_REPORT", null)).toBe(false);
    expect(standingAllowed("EMAIL", 0)).toBe(false);
  });
});

describe("المواعيد والأمان", () => {
  it("التقرير الأسبوعي الجاي", () => {
    const thu = new Date("2026-11-19T10:00:00Z"); // خميس
    expect(nextWeekly(0, thu).toISOString()).toBe("2026-11-22T04:00:00.000Z"); // أحد
    expect(nextWeekly(4, thu).toISOString()).toBe("2026-11-26T04:00:00.000Z"); // الخميس الجاي
    expect(nextWeekly(4, new Date("2026-11-19T03:00:00Z")).toISOString()).toBe("2026-11-19T04:00:00.000Z");
  });
  it("الملخّص بدون أرقام", () => {
    expect(safeSummary("المبيعات 12,500 كرتونة بزيادة 8.5%")).toBe("المبيعات # كرتونة بزيادة #%");
    expect(safeSummary("طلع ١٢٫٥ ألف")).toBe("طلع # ألف");
    expect(safeSummary("")).toBeNull();
  });
  it("اللابتوب أونلاين", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    expect(agentOnline(new Date("2026-11-20T09:55:00Z"), now)).toBe(true);
    expect(agentOnline(null, now)).toBe(false);
  });
});
