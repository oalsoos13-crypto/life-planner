// فحص «الاستراتيجية السيئة» (Rumelt) كمواصفات (DDD: Specification؛ Pragmatic: التعامد)
// كل فحص دالة صغيرة؛ فحص جديد = دالة + اختبار بدون ما تلمس الباقي.
import { MAX_ACTIVE_OKRS, KR_MIN, looksLikeTask } from "./okr";
import { PERSPECTIVES, PERSPECTIVE_LABEL, type Perspective } from "./perspective";
import { withBuffer } from "@/shared/kernel/values";

export type StrategySnapshot = {
  kernel: { coreChallenge: string | null; guidingPolicy: string | null; essentialIntent: string | null; freeHours: number | null };
  strategicGoals: { id: string; title: string; perspective: Perspective; metricCount: number }[];
  okrs: { id: string; title: string; strategicGoalId: string | null; weeklyHours: number | null; krs: { name: string; target: number | null }[] }[];
  notDoingCount: number;
};

export type Warning = { code: string; message: string; fix: string; book: string };
type Check = (s: StrategySnapshot) => Warning | Warning[] | null;

const emptyChallenge: Check = (s) =>
  s.kernel.coreChallenge?.trim()
    ? null
    : { code: "EMPTY_CHALLENGE", message: "التحدي الأساسي فاضي", fix: "اكتب أكبر عقبة بجملة وحدة", book: "Good Strategy Bad Strategy" };

const emptyPolicy: Check = (s) =>
  s.kernel.guidingPolicy?.trim()
    ? null
    : { code: "EMPTY_POLICY", message: "ما في سياسة موجّهة", fix: "«رح أتعامل مع التحدي عن طريق... ومش عن طريق...»", book: "Good Strategy Bad Strategy" };

const tooManyOkrs: Check = (s) =>
  s.okrs.length > MAX_ACTIVE_OKRS
    ? { code: "TOO_MANY_OKRS", message: `${s.okrs.length} أولويات نشطة`, fix: `الحد ${MAX_ACTIVE_OKRS}: اختار شو بتشيل`, book: "Measure What Matters" }
    : null;

const noOkrs: Check = (s) =>
  s.okrs.length === 0
    ? { code: "NO_OKRS", message: "ما في ولا أولوية نشطة للربع", fix: "رقّي هدف لـ OKR", book: "Measure What Matters" }
    : null;

const okrWithoutStrategicGoal: Check = (s) =>
  s.okrs
    .filter((o) => !o.strategicGoalId)
    .map((o) => ({ code: "OKR_UNLINKED", message: `«${o.title}» مش مربوط بهدف استراتيجي`, fix: "اربطه بهدف 3 سنين", book: "Balanced Scorecard" }));

const krWrittenAsTask: Check = (s) =>
  s.okrs.flatMap((o) =>
    o.krs.filter(looksLikeTask).map((k) =>
      k.target == null
        ? { code: "KR_NO_TARGET", message: `«${k.name}» ما إلها رقم هدف`, fix: "حدّد الرقم: من كم لكم؟", book: "Measure What Matters" }
        : { code: "KR_AS_TASK", message: `«${k.name}» مكتوبة كمهمة`, fix: "النتيجة الرئيسية رقم مش مهمة: شو الرقم الي بيتغير؟", book: "Measure What Matters" }
    )
  );

const fewKrs: Check = (s) =>
  s.okrs
    .filter((o) => o.krs.length < KR_MIN)
    .map((o) => ({ code: "FEW_KRS", message: `«${o.title}» فيه ${o.krs.length} نتائج بس`, fix: `${KR_MIN}-5 نتائج رئيسية`, book: "Measure What Matters" }));

const strategicGoalCount: Check = (s) => {
  const n = s.strategicGoals.length;
  if (n >= 4 && n <= 6) return null;
  return { code: "SG_COUNT", message: `${n} أهداف استراتيجية`, fix: "خليهم بين 4 و6", book: "Balanced Scorecard" };
};

const strategicGoalWithoutMetric: Check = (s) =>
  s.strategicGoals
    .filter((g) => g.metricCount === 0)
    .map((g) => ({ code: "SG_NO_METRIC", message: `«${g.title}» بدون مؤشر`, fix: "شو الرقم الي بيقلّك إنك وصلت؟", book: "Balanced Scorecard" }));

const emptyPerspective: Check = (s) =>
  PERSPECTIVES.filter((p) => !s.strategicGoals.some((g) => g.perspective === p)).map((p) => ({
    code: "EMPTY_PERSPECTIVE",
    message: `منظور «${PERSPECTIVE_LABEL[p]}» فاضي`,
    fix: "ولا هدف استراتيجي فيه",
    book: "Balanced Scorecard",
  }));

const noNotDoing: Check = (s) =>
  s.notDoingCount === 0
    ? { code: "NO_NOT_DOING", message: "ما في قائمة «لا»", fix: "شو رح تتركه عن قصد هالربع؟", book: "Essentialism" }
    : null;

const timeBudgetOverflow: Check = (s) => {
  const free = s.kernel.freeHours;
  const planned = s.okrs.reduce((a, o) => a + (o.weeklyHours ?? 0), 0);
  if (free == null || planned === 0) return null;
  const need = withBuffer(planned);
  return need > free
    ? { code: "TIME_OVERFLOW", message: `ميزانية الوقت زايدة ${Math.round((need - free) * 10) / 10} ساعة بالأسبوع`, fix: "مع هامش 50%. قلّل ساعات أو OKR", book: "Essentialism" }
    : null;
};

export const badStrategyChecks: Check[] = [
  emptyChallenge,
  emptyPolicy,
  noOkrs,
  tooManyOkrs,
  okrWithoutStrategicGoal,
  krWrittenAsTask,
  fewKrs,
  strategicGoalCount,
  strategicGoalWithoutMetric,
  emptyPerspective,
  noNotDoing,
  timeBudgetOverflow,
];

export const auditStrategy = (s: StrategySnapshot): Warning[] =>
  badStrategyChecks.flatMap((c) => {
    const r = c(s);
    return r == null ? [] : Array.isArray(r) ? r : [r];
  });
