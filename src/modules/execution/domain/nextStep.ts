// «شو أعمل هلأ؟» (Don't Make Me Think، About Face): مهمة وحدة، الأهم أول
// الترتيب: ماشية قبل لسا، وبعدين حسب رتبة الأولوية (OKR 1 قبل 2)، وبعدين المربوطة بهدف قبل الروتين.
export type NextCandidate = { id: string; status: string; cancelled: boolean; okrRank: number | null; hasGoal: boolean; order: number };

export function pickNextStep<T extends NextCandidate>(tasks: T[]): T | null {
  const open = tasks.filter((t) => !t.cancelled && t.status !== "DONE");
  if (!open.length) return null;
  const key = (t: T) => [t.okrRank ?? 9, t.status === "IN_PROGRESS" ? 0 : 1, t.hasGoal ? 0 : 1, t.order];
  return [...open].sort((a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  })[0];
}
