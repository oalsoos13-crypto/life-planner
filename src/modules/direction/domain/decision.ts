// سجل القرارات (Kahneman، Dalio، Essentialism): قرار مكتوب بخيارات وفحص، وبعدين مراجعة النتيجة.

export type DecisionOption = { text: string; score: number | null };

export const BIASES = [
  { key: "sunk", label: "التكلفة الغارقة", q: "لو ما كنت دافع شي لهلّق، كنت رح تختار نفس الشي؟" },
  { key: "anchor", label: "الإرساء", q: "أول رقم أو رأي سمعته، هل هو الي عم يحدّد تفكيرك؟" },
  { key: "overconfidence", label: "الثقة الزايدة", q: "شو احتمال إنك غلطان؟ اضرب تقدير الوقت بـ 1.5" },
  { key: "loss", label: "النفور من الخسارة", q: "هل خوفك من الخسارة أكبر من قيمة الربح الحقيقية؟" },
  { key: "outside", label: "الرؤية من برّا", q: "شو بيصير عادةً مع الناس الي بيعملوا نفس القرار؟" },
] as const;
export type BiasKey = (typeof BIASES)[number]["key"];

/** قاعدة 90% (Essentialism): إذا أعلى خيار مش «أكيد نعم» (9 أو أكتر من 10)، فهو لا */
export function ninetyRule(options: DecisionOption[]): { best: DecisionOption | null; verdict: "YES" | "NO" | "UNSCORED" } {
  const scored = options.filter((o) => o.text.trim() && o.score != null);
  if (!scored.length) return { best: null, verdict: "UNSCORED" };
  const best = scored.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a));
  return { best, verdict: (best.score ?? 0) >= 9 ? "YES" : "NO" };
}

export type DecisionDraft = { options: DecisionOption[]; premortem: string | null; biases: string[]; reviewAt: string | null; chosen: string | null; why: string | null };

/** شو ناقص قبل ما تقرّر (فحص الاستراتيجية السيئة على مستوى القرار) */
export function decisionGaps(d: DecisionDraft): string[] {
  const gaps: string[] = [];
  if (d.options.filter((o) => o.text.trim()).length < 2) gaps.push("خيارين على الأقل (حتى لو التاني «ما أعمل شي»)");
  if (!d.premortem?.trim()) gaps.push("Premortem: تخيّل إنه فشل بعد سنة، ليش؟");
  if (d.biases.length < BIASES.length) gaps.push(`فحص التحيّزات (${d.biases.length} من ${BIASES.length})`);
  if (!d.reviewAt) gaps.push("تاريخ تراجع فيه النتيجة");
  if (d.chosen && !d.why?.trim()) gaps.push("ليش اخترت هيك؟ (عشان تتعلّم بالمراجعة)");
  return gaps;
}

export function reviewDue(reviewAt: string | null, status: string, today: string): boolean {
  return status === "DECIDED" && !!reviewAt && reviewAt <= today;
}
