// قواعد OKRs (Doerr: Measure What Matters؛ McKeown: Essentialism)
import { err, ok, type Result } from "@/shared/kernel/result";
import { progress, type MetricTarget } from "@/shared/kernel/metricTarget";

export const MAX_ACTIVE_OKRS = 3; // DRY: الرقم بمكان واحد بس
export const KR_MIN = 3;
export const KR_MAX = 5;

export type OkrType = "COMMITTED" | "ASPIRATIONAL";

export const OKR_TYPE_LABEL: Record<OkrType, string> = { COMMITTED: "ملتزم", ASPIRATIONAL: "طموح" };

/** أول رتبة فاضية (1..3)، أو رفض بلغة المنهجية */
export function nextOkrRank(takenRanks: number[]): Result<number> {
  for (let r = 1; r <= MAX_ACTIVE_OKRS; r++) if (!takenRanks.includes(r)) return ok(r);
  return err("OKR_LIMIT", `عندك ${MAX_ACTIVE_OKRS} أولويات نشطة. اختار شو بدك تشيل قبل ما تضيف رابعة.`);
}

/** هل بقدر أضيف نتيجة رئيسية كمان؟ */
export function canAddKeyResult(currentCount: number): Result<true> {
  return currentCount < KR_MAX ? ok(true) : err("KR_LIMIT", `الحد ${KR_MAX} نتائج رئيسية. أكثر من هيك بيضيّع التركيز.`);
}

/** النجاح حسب النوع: الملتزم = 1.0، الطموح = 0.7 (Doerr) */
export function isOkrSuccess(score: number, type: OkrType) {
  return type === "COMMITTED" ? score >= 1 : score >= 0.7;
}

export type KrForScore = MetricTarget & { latest: number | null };

/** علامة OKR = متوسط تقدم النتائج القابلة للقياس (مشتق، ما بيتخزّن: DDIA) */
export function okrScore(krs: KrForScore[]): number | null {
  const ps = krs.map((k) => progress(k, k.latest ?? k.start)).filter((p): p is number => p != null);
  if (!ps.length) return null;
  return Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) / 100;
}

/** لون العلامة بلغة Doerr: 0.7+ أخضر، 0.4-0.6 أصفر، أقل أحمر */
export function scoreBand(score: number | null): "none" | "low" | "mid" | "high" {
  if (score == null) return "none";
  return score >= 0.7 ? "high" : score >= 0.4 ? "mid" : "low";
}

const TASK_VERBS = /^(أعمل|اعمل|أكتب|اكتب|أطلق|اطلق|أنشر|انشر|أجهز|جهز|أبني|ابني|أخلص|خلص|أحجز|احجز|أسوي|سوي|أبدأ|ابدأ|أرتب|رتب|أصمم|صمم)\s/;

/** «النتيجة الرئيسية رقم مش مهمة»: إذا ما إلها هدف رقمي أو بتبلّش بفعل مهمة */
export function looksLikeTask(kr: { name: string; target: number | null }) {
  return kr.target == null || TASK_VERBS.test(kr.name.trim());
}
