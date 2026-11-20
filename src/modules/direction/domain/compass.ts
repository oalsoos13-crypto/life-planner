// البوصلة (منهجية §1): التوجيه قبل التخطيط. منطق نقي.

export const VALUES_MAX = 5;
export const COMPASS_ITEM_KINDS = ["VALUE", "PRINCIPLE", "IDENTITY"] as const;
export type CompassItemKind = (typeof COMPASS_ITEM_KINDS)[number];

export type CompassFields = {
  bhag: string | null;
  picture3y: string | null;
  mission: string | null;
  winning: string | null;
  why: string | null;
  eulogy: string | null;
  enough: number | null;
};
export const COMPASS_FIELDS = ["bhag", "picture3y", "mission", "winning", "why", "eulogy"] as const;
export type CompassTextField = (typeof COMPASS_FIELDS)[number];

/** المبدأ لازم يكون بشكل «لما… بعمل… لأنه…» (Dalio) */
export function principleShape(text: string): { ok: boolean; hint: string | null } {
  const t = text.trim();
  const ok = /^(لما|لمّا|إذا|اذا)/.test(t) && /(بعمل|بسوي|رح|بـ)/.test(t) && /(لأنه|لانه|لأن|لان)/.test(t);
  return { ok, hint: ok ? null : "جرّب الشكل: «لما ___، بعمل ___، لأنه ___»" };
}

/** جملة الهوية بتبلّش بـ «أنا شخص…» (Atomic Habits) */
export function identityShape(text: string): string {
  const t = text.trim();
  return /^أنا/.test(t) ? t : `أنا شخص ${t}`;
}

export type CompassStatus = { done: number; total: number; next: string | null };

/** قديش البوصلة كاملة، وشو الخطوة الجاية (بترتيب المنهجية: التأبين ← القيم ← الرؤية ← …) */
export function compassStatus(c: CompassFields, counts: Record<CompassItemKind, number>): CompassStatus {
  const steps: [boolean, string][] = [
    [!!c.eulogy?.trim(), "تمرين يوم التأبين: شو بدّك الناس يحكوا عنك؟"],
    [counts.VALUE >= 3, "قيمك: 3 لـ 5 قيم، كل وحدة بتعريف سلوكي"],
    [!!c.bhag?.trim(), "الهدف الكبير الجريء (BHAG)"],
    [!!c.picture3y?.trim(), "صورة حياتك بعد 3 سنين"],
    [!!c.mission?.trim(), "رسالتك بجملة"],
    [!!c.winning?.trim(), "«الفوز إلي يعني…»"],
    [counts.PRINCIPLE >= 3, "3 مبادئ «لما… بعمل… لأنه…»"],
    [counts.IDENTITY >= 2, "جمل هوية «أنا شخص…»"],
    [!!c.why?.trim(), "بطاقة «ليش»: ليش كل هالتعب؟"],
    [c.enough != null && c.enough > 0, "رقم «كفاية» بالشهر"],
  ];
  const done = steps.filter((s) => s[0]).length;
  return { done, total: steps.length, next: steps.find((s) => !s[0])?.[1] ?? null };
}
