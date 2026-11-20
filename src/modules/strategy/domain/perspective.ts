// المنظورات الأربعة (بطاقة الأداء المتوازن الشخصية: Kaplan & Norton)
export const PERSPECTIVES = ["FINANCE", "IMPACT", "SYSTEM", "GROWTH"] as const;
export type Perspective = (typeof PERSPECTIVES)[number];

export const PERSPECTIVE_LABEL: Record<Perspective, string> = {
  FINANCE: "المال",
  IMPACT: "الأثر والناس",
  SYSTEM: "حياتي كنظام",
  GROWTH: "التعلّم والنمو",
};

/** ترتيب خريطة الاستراتيجية: التعلّم تحت، المال فوق */
export const MAP_ORDER: Perspective[] = ["FINANCE", "IMPACT", "SYSTEM", "GROWTH"];
