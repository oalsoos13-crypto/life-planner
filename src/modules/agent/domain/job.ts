// الوكيل على اللابتوب: دورة حياة المهمة. دوال نقية بس (ADR-002).
// القاعدة الذهبية: ما في شي بيطلع لبرّا (إيميل) بدون موافقتك، إلا إذا عطيت إذن دائم لتقرير متكرّر.

export const JOB_KINDS = ["EXCEL_REPORT", "EMAIL", "OTHER"] as const;
export type JobKind = (typeof JOB_KINDS)[number];
export const JOB_STATUSES = ["QUEUED", "RUNNING", "NEEDS_APPROVAL", "APPROVED", "SENDING", "DONE", "FAILED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const KIND_LABEL: Record<JobKind, string> = { EXCEL_REPORT: "تقرير Excel", EMAIL: "إيميل", OTHER: "شغلة" };
export const STATUS_LABEL: Record<JobStatus, string> = {
  QUEUED: "بالدور",
  RUNNING: "عم يشتغل",
  NEEDS_APPROVAL: "بيستنى موافقتك",
  APPROVED: "موافَق، رح يبعت",
  SENDING: "عم يبعت",
  DONE: "خلص",
  FAILED: "ما زبط",
  CANCELLED: "ملغي",
};

/** شو اللابتوب بيقدر يبلّغ */
export type AgentReport = "READY_FOR_APPROVAL" | "DONE" | "FAILED";
/** شو إنت بتقدر تعمل */
export type UserAction = "APPROVE" | "REJECT" | "CANCEL" | "RETRY";

/** اللابتوب بيستلم مهمة: الجديدة بتصير RUNNING، والموافق عليها بتصير SENDING */
export function claimable(s: JobStatus): boolean {
  return s === "QUEUED" || s === "APPROVED";
}
export function onClaim(s: JobStatus): JobStatus | null {
  return s === "QUEUED" ? "RUNNING" : s === "APPROVED" ? "SENDING" : null;
}

/** تقرير اللابتوب. مع إذن دائم، «جاهز للموافقة» بيصير موافق لحاله */
export function onReport(s: JobStatus, r: AgentReport, standing: boolean): JobStatus | null {
  if (s !== "RUNNING" && s !== "SENDING") return null;
  if (r === "FAILED") return "FAILED";
  if (r === "DONE") return "DONE";
  // READY_FOR_APPROVAL بس بمرحلة التحضير
  if (s !== "RUNNING") return null;
  return standing ? "APPROVED" : "NEEDS_APPROVAL";
}

export function onUser(s: JobStatus, a: UserAction): JobStatus | null {
  switch (a) {
    case "APPROVE": return s === "NEEDS_APPROVAL" ? "APPROVED" : null;
    case "REJECT": return s === "NEEDS_APPROVAL" ? "CANCELLED" : null;
    case "CANCEL": return s === "QUEUED" || s === "NEEDS_APPROVAL" || s === "APPROVED" ? "CANCELLED" : null;
    case "RETRY": return s === "FAILED" || s === "CANCELLED" || s === "DONE" ? "QUEUED" : null;
  }
}

/** الإذن الدائم بس للتقارير المتكرّرة (المخطط: «أو بإذن دائم للتقارير المتكرّرة») */
export const standingAllowed = (kind: JobKind, repeatDay: number | null) => kind === "EXCEL_REPORT" && repeatDay != null;

/** موعد التشغيل الجاي لتقرير أسبوعي: أول يوم repeatDay بعد from، الساعة 7 الصبح بتوقيت الكويت (04:00 UTC) */
export function nextWeekly(repeatDay: number, from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 4, 0, 0));
  let add = (repeatDay - d.getUTCDay() + 7) % 7;
  if (add === 0 && d <= from) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}

/** إذا اللابتوب ما بيّن من أكتر من 10 دقايق، منعتبره مطفي */
export const agentOnline = (seen: Date | null, now: Date) => !!seen && now.getTime() - seen.getTime() < 10 * 60_000;

/** الملخّص الي بيرجع من اللابتوب: قصير، وبدون أرقام (سرية الشركة) */
export function safeSummary(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/[0-9٠-٩۰-۹][0-9٠-٩۰-۹,.٬٫]*/g, "#").replace(/\s+/g, " ").trim().slice(0, 300);
  return t || null;
}
