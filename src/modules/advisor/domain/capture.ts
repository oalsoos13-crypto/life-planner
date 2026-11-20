// وحدة المستشار: فهم الكلام الملتقط وربطه بالسلسلة (مهمة ← مؤشر ← OKR ← هدف استراتيجي ← رؤية).
// منطق نقي بدون قاعدة بيانات ولا شبكة (ADR-002). المحلّل الذكي (Claude) بيرجّع نفس الشكل.

export const ITEM_KINDS = ["TASK", "HABIT", "EXPENSE", "METRIC", "ENERGY", "MOOD", "NOTE"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** عنصر مستخرج من الكلام قبل ما يتطبّق. كل الحقول موجودة، والي ما إله معنى null (أسهل للمخرجات المنظّمة) */
export type Extracted = {
  kind: ItemKind;
  title: string;
  goalId: string | null;
  habitId: string | null;
  metricId: string | null;
  value: number | null; // قيمة المؤشر، أو مستوى الطاقة/المزاج 1..5
  amount: number | null; // المصروف بالدينار
  category: string | null;
};

export type CaptureContext = {
  today: string;
  habits: { id: string; name: string; pillar: string | null }[];
  goals: { id: string; title: string; pillar: string; rank: number | null; strategicGoal: string | null; metrics: { id: string; name: string; unit: string | null; latest: number | null }[] }[];
  essentialIntent: string | null;
};

export const KIND_LABEL: Record<ItemKind, string> = {
  TASK: "مهمة",
  HABIT: "عادة",
  EXPENSE: "مصروف",
  METRIC: "مؤشر",
  ENERGY: "طاقة",
  MOOD: "مزاج",
  NOTE: "فكرة",
};

const RANK = ["", "١", "٢", "٣"];

/** السلسلة الي بتطلع تحت كل عنصر: من وين لوين بيحرّك */
export function chainFor(item: Extracted, ctx: CaptureContext): string | null {
  const metricGoal = item.metricId ? ctx.goals.find((g) => g.metrics.some((m) => m.id === item.metricId)) : null;
  const goal = metricGoal ?? (item.goalId ? ctx.goals.find((g) => g.id === item.goalId) : null);
  const habit = item.habitId ? ctx.habits.find((h) => h.id === item.habitId) : null;
  const parts: string[] = [];
  if (habit) parts.push(habit.pillar ? `${habit.name} ← ${habit.pillar}` : habit.name);
  if (item.metricId && metricGoal) {
    const m = metricGoal.metrics.find((x) => x.id === item.metricId)!;
    parts.push(m.name);
  }
  if (goal) {
    parts.push(goal.rank ? `أولوية ${RANK[goal.rank] ?? goal.rank}: ${goal.title}` : `${goal.pillar}: ${goal.title}`);
    if (goal.strategicGoal) parts.push(goal.strategicGoal);
  }
  if (item.kind === "EXPENSE") parts.push(`المال ← ${item.category ?? "مصاريف"}`);
  if (item.kind === "ENERGY" || item.kind === "MOOD") parts.push("ملفك الحي ← نمط طاقتك");
  return parts.length ? parts.join(" ← ") : null;
}

/** تنظيف مخرجات المحلّل: بيرمي المعرّفات الي مش موجودة والأرقام الغلط، فما في شي بيتطبّق على غلط */
export function sanitize(items: Extracted[], ctx: CaptureContext): Extracted[] {
  const habitIds = new Set(ctx.habits.map((h) => h.id));
  const goalIds = new Set(ctx.goals.map((g) => g.id));
  const metricIds = new Set(ctx.goals.flatMap((g) => g.metrics.map((m) => m.id)));
  const out: Extracted[] = [];
  for (const raw of items.slice(0, 12)) {
    if (!ITEM_KINDS.includes(raw.kind)) continue;
    const it: Extracted = {
      ...raw,
      title: (raw.title ?? "").trim().slice(0, 200),
      goalId: raw.goalId && goalIds.has(raw.goalId) ? raw.goalId : null,
      habitId: raw.habitId && habitIds.has(raw.habitId) ? raw.habitId : null,
      metricId: raw.metricId && metricIds.has(raw.metricId) ? raw.metricId : null,
      value: raw.value != null && Number.isFinite(raw.value) ? raw.value : null,
      amount: raw.amount != null && Number.isFinite(raw.amount) && raw.amount > 0 ? Math.round(raw.amount * 1000) / 1000 : null,
      category: raw.category?.trim().slice(0, 40) || null,
    };
    if (!it.title) continue;
    if (it.kind === "HABIT" && !it.habitId) it.kind = "NOTE";
    if (it.kind === "METRIC" && (!it.metricId || it.value == null)) it.kind = "NOTE";
    if (it.kind === "EXPENSE" && it.amount == null) it.kind = "NOTE";
    if ((it.kind === "ENERGY" || it.kind === "MOOD") && (it.value == null || it.value < 1 || it.value > 5)) it.kind = "NOTE";
    if (it.kind === "ENERGY" || it.kind === "MOOD") it.value = Math.round(it.value!);
    out.push(it);
  }
  return out;
}

const EXPENSE_RE = /(\d+(?:[.,]\d+)?)\s*(?:دينار|دنانير|د\.ك|KD|kd|فلس)/;
const TASK_RE = /(لازم|بدّي|بدي|طلب|طلبت|موعد|بكرة|بكره|ذكّرني|ذكرني|ما أنسى|ما انسى)/;
const NEG_RE = /(ما|مش|ما\s+قدرت)\s/;

/**
 * محلّل احتياطي بالقواعد (لما ما في مفتاح للمستشار أو فشل الاتصال): أبسط من Claude بكتير،
 * بس بيمسك المصاريف والعادات والمهام الواضحة، والباقي بيضل فكرة.
 */
export function ruleExtract(text: string, ctx: CaptureContext): Extracted[] {
  const base = { goalId: null, habitId: null, metricId: null, value: null, amount: null, category: null };
  const parts = text.split(/[،,.؛\n]|(?:\sو(?=\S))/).map((s) => s.trim()).filter((s) => s.length > 1);
  const out: Extracted[] = [];
  for (const p of parts) {
    if (/^(فكرة|فكره|ملاحظة)/.test(p)) {
      out.push({ ...base, kind: "NOTE", title: p.replace(/^(فكرة|فكره|ملاحظة)\s*:?\s*/, "") || p });
      continue;
    }
    const ex = p.match(EXPENSE_RE);
    if (ex) {
      const amount = Number(ex[1].replace(",", ".")) / (/فلس/.test(p) ? 1000 : 1);
      out.push({ ...base, kind: "EXPENSE", title: p, amount, category: /غدا|عشا|فطور|أكل|اكل|قهوة|مطعم/.test(p) ? "أكل" : /بنزين|تكسي|اوبر|أوبر/.test(p) ? "مواصلات" : "متفرقات" });
      continue;
    }
    const habit = !NEG_RE.test(p + " ") ? ctx.habits.find((h) => p.includes(h.name.split(" ")[0])) : undefined;
    if (habit) {
      out.push({ ...base, kind: "HABIT", title: p, habitId: habit.id });
      continue;
    }
    if (TASK_RE.test(p)) {
      out.push({ ...base, kind: "TASK", title: p });
      continue;
    }
    out.push({ ...base, kind: "NOTE", title: p });
  }
  return out.length ? out : [{ ...base, kind: "NOTE", title: text.trim().slice(0, 200) }];
}
