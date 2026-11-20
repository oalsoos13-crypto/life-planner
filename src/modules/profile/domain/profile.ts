// الملف الحي: شو بيعرف التطبيق عن عمر. دوال نقية بس (ADR-002).
// المصادر: Designing Your Life (مذكرة الطاقة)، Atomic Habits (ما تفوّت مرتين)، The Mountain Is You (أنماط التأجيل)،
// Psychology of Money (وين بتروح المصاري)، Carnegie (دفتر العلاقات)، Dalio (ألم ← سبب ← مبدأ).

export const PROFILE_AREAS = ["VALUES", "ENERGY", "HABITS", "PROCRASTINATION", "TRIGGERS", "MONEY", "STRENGTHS", "PREFERENCES"] as const;
export type ProfileArea = (typeof PROFILE_AREAS)[number];
export const FACT_SOURCES = ["DATA", "CLAUDE", "ME"] as const;
export type FactSource = (typeof FACT_SOURCES)[number];
export const FACT_STATUSES = ["NEW", "CONFIRMED", "REJECTED"] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

export const AREA_LABEL: Record<ProfileArea, { title: string; hint: string; ref: string }> = {
  VALUES: { title: "قيمك", hint: "شو الي بيهمّك فعلاً", ref: "DYL" },
  ENERGY: { title: "طاقتك", hint: "إمتى بتكون بأحسن حالاتك", ref: "DYL" },
  HABITS: { title: "عاداتك", hint: "شو ماشي وشو بيوقع", ref: "Atomic Habits" },
  PROCRASTINATION: { title: "التأجيل", hint: "شو بتأجّل وليش", ref: "The Mountain Is You" },
  TRIGGERS: { title: "المحفّزات", hint: "شو بيرفعك وشو بينزّلك", ref: "Dalio" },
  MONEY: { title: "مصاريك", hint: "وين بتروح المصاري", ref: "Housel" },
  STRENGTHS: { title: "نقاط قوّتك", hint: "شو بتعمله أحسن من غيرك", ref: "VRIN" },
  PREFERENCES: { title: "طريقتك", hint: "كيف بتحب تشتغل وتنحكى", ref: "" },
};

const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export type DerivedFact = { key: string; area: ProfileArea; text: string; evidence: string; confidence: number };

export type ProfileInput = {
  /** آخر 60 يوم من مذكرة اليوم */
  days: { weekday: number; energy: number | null; mood: number | null }[];
  /** العادات: كم يوم عملها من آخر N يوم كانت فيه موجودة، وأطول انقطاع */
  habits: { name: string; doneDays: number; possibleDays: number; misses2: number }[];
  /** المهام الي انرحّلت أكتر من مرة أو علقت */
  tasks: { pillar: string | null; carryCount: number; stuck: boolean; done: boolean; doneWeekday: number | null }[];
  /** مصاريف آخر 30 يوم */
  expenses: { category: string; amount: number }[];
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;
const conf = (n: number, full: number) => Math.max(0.3, Math.min(0.95, n / full));

/** بيستنتج حقائق من البيانات. كل حقيقة إلها مفتاح ثابت، فبتنحدّث بدل ما تتكرّر */
export function deriveFacts(input: ProfileInput): DerivedFact[] {
  const out: DerivedFact[] = [];

  // الطاقة حسب أيام الأسبوع: بدنا 6 أيام مسجّلة على الأقل، ويومين لكل يوم أسبوع لنحكي عنه
  const withEnergy = input.days.filter((d) => d.energy != null);
  if (withEnergy.length >= 6) {
    const byDay = new Map<number, number[]>();
    for (const d of withEnergy) byDay.set(d.weekday, [...(byDay.get(d.weekday) ?? []), d.energy!]);
    const ranked = [...byDay.entries()].filter(([, v]) => v.length >= 2).map(([w, v]) => ({ w, a: avg(v), n: v.length })).sort((x, y) => y.a - x.a);
    if (ranked.length >= 2 && ranked[0].a - ranked[ranked.length - 1].a >= 0.8) {
      const hi = ranked[0], lo = ranked[ranked.length - 1];
      out.push({
        key: "energy:weekday",
        area: "ENERGY",
        text: `طاقتك بتكون أعلى يوم ${WEEKDAYS[hi.w]}، وأوطى يوم ${WEEKDAYS[lo.w]}. حط الشغل الثقيل يوم ${WEEKDAYS[hi.w]}.`,
        evidence: `متوسط ${round1(hi.a)} من 5 مقابل ${round1(lo.a)}، من ${withEnergy.length} يوم مسجّل`,
        confidence: conf(withEnergy.length, 30),
      });
    }
    const overall = avg(withEnergy.map((d) => d.energy!));
    if (overall <= 2.6) {
      out.push({ key: "energy:low", area: "ENERGY", text: "طاقتك بالعموم واطية. النوم والأكل أولاً قبل أي خطة جديدة.", evidence: `متوسط ${round1(overall)} من 5`, confidence: conf(withEnergy.length, 20) });
    }
  }

  // العادات: الأقوى والأضعف، و«ما تفوّت مرتين»
  const rated = input.habits.filter((h) => h.possibleDays >= 7).map((h) => ({ ...h, rate: h.doneDays / h.possibleDays }));
  if (rated.length) {
    const best = [...rated].sort((a, b) => b.rate - a.rate)[0];
    if (best.rate >= 0.6)
      out.push({ key: "habits:best", area: "STRENGTHS", text: `«${best.name}» صارت جزء منك. هي الأساس الي بتبني عليه عادات جديدة (تكديس العادات).`, evidence: `${best.doneDays} من ${best.possibleDays} يوم`, confidence: conf(best.possibleDays, 28) });
    const worst = [...rated].sort((a, b) => a.rate - b.rate)[0];
    if (worst.rate < 0.4 && worst !== best)
      out.push({ key: "habits:weak", area: "HABITS", text: `«${worst.name}» بتوقع كتير. صغّرها لنسخة دقيقتين، أو اربطها بعادة ثابتة.`, evidence: `${worst.doneDays} من ${worst.possibleDays} يوم`, confidence: conf(worst.possibleDays, 28) });
    const breaker = [...rated].sort((a, b) => b.misses2 - a.misses2)[0];
    if (breaker.misses2 >= 2)
      out.push({ key: "habits:miss2", area: "HABITS", text: `مع «${breaker.name}» لما بتفوّت يوم، غالباً بتفوّت التاني كمان. القاعدة: ما تفوّت مرتين.`, evidence: `${breaker.misses2} مرات فوّتت يومين ورا بعض`, confidence: 0.6 });
  }

  // التأجيل: أي محور بتترحّل مهامه أكتر
  const carried = input.tasks.filter((t) => t.carryCount >= 2 || t.stuck);
  if (carried.length >= 3) {
    const byPillar = new Map<string, number>();
    for (const t of carried) byPillar.set(t.pillar ?? "اعتيادي", (byPillar.get(t.pillar ?? "اعتيادي") ?? 0) + 1);
    const [pillar, n] = [...byPillar.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n >= 2)
      out.push({
        key: "procrastination:pillar",
        area: "PROCRASTINATION",
        text: `مهام «${pillar}» هي الي بتأجّلها أكتر. غالباً الخطوة الأولى مش واضحة: قسّمها لشي بيخلص بـ25 دقيقة.`,
        evidence: `${n} من ${carried.length} مهام انرحّلت مرتين أو علقت`,
        confidence: conf(carried.length, 10),
      });
  }

  // اليوم الي بتخلّص فيه أكتر
  const doneDays = input.tasks.filter((t) => t.done && t.doneWeekday != null).map((t) => t.doneWeekday!);
  if (doneDays.length >= 8) {
    const counts = new Array(7).fill(0) as number[];
    for (const w of doneDays) counts[w]++;
    const top = counts.indexOf(Math.max(...counts));
    if (counts[top] / doneDays.length >= 0.3)
      out.push({ key: "strength:doneday", area: "STRENGTHS", text: `يوم ${WEEKDAYS[top]} هو يوم الإنجاز عندك. احمِه من المواعيد.`, evidence: `${counts[top]} من ${doneDays.length} مهمة خلصت فيه`, confidence: conf(doneDays.length, 30) });
  }

  // المصاري: وين بتروح
  const total = input.expenses.reduce((a, e) => a + e.amount, 0);
  if (input.expenses.length >= 5 && total > 0) {
    const byCat = new Map<string, number>();
    for (const e of input.expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    const [cat, amt] = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = Math.round((amt / total) * 100);
    if (share >= 30)
      out.push({ key: "money:top", area: "MONEY", text: `«${cat}» بياكل ${share}% من مصاريفك. هون أسهل مكان توفّر فيه.`, evidence: `${round1(amt)} د.ك من ${round1(total)} بآخر 30 يوم`, confidence: conf(input.expenses.length, 25) });
  }

  return out;
}

// ── «قديش بيعرفني» ──
export type KnowInput = {
  values: number; // قيم معرّفة بالبوصلة
  compassDone: number; // خطوات البوصلة المكتملة من 10
  energyDays: number; // أيام فيها طاقة مسجّلة (آخر 60)
  habitDays: number; // أيام فيها عادة معلّمة (آخر 28)
  captures: number; // كل التسجيلات
  confirmed: number; // حقائق أكّدها أو كتبها
  pending: number; // حقائق جديدة لسا ما راجعها
  people: number;
  expenses: number; // مصاريف مسجّلة (آخر 30)
};

export type KnowPart = { key: string; label: string; got: number; max: number; next: string };

const part = (key: string, label: string, max: number, ratio: number, next: string): KnowPart => ({ key, label, max, got: Math.round(max * Math.max(0, Math.min(1, ratio))), next });

/** نسبة من 100، مقسومة على أبعاد واضحة، مع «شو بيزيدها» لكل بعد. مش تدريب نموذج: هي تغطية بيانات وتصحيحات */
export function knowScore(k: KnowInput): { score: number; parts: KnowPart[]; next: KnowPart | null } {
  const reviewed = k.confirmed + k.pending ? k.confirmed / (k.confirmed + k.pending) : 0;
  const parts = [
    part("values", "قيمك واتجاهك", 20, (Math.min(k.values, 5) / 5) * 0.5 + (k.compassDone / 10) * 0.5, "كمّل البوصلة: قيمك ورؤيتك"),
    part("captures", "كلامك اليومي", 20, k.captures / 60, "احكي عن يومك بالمايك كل يوم"),
    part("energy", "طاقتك ومزاجك", 15, k.energyDays / 30, "علّم طاقتك كل يوم من «اليوم»"),
    part("habits", "عاداتك", 10, k.habitDays / 21, "علّم نجومك (عاداتك) كل يوم"),
    part("confirmed", "تصحيحاتك", 15, (Math.min(k.confirmed, 12) / 12) * 0.7 + reviewed * 0.3, "راجع الحقائق تحت: ✓ صح أو صحّحها"),
    part("people", "ناسك", 10, k.people / 6, "زيد الناس المهمين بحياتك"),
    part("money", "مصاريك", 10, k.expenses / 25, "سجّل مصاريفك بالحكي: «دفعت 3 دينار غدا»"),
  ];
  const score = parts.reduce((a, p) => a + p.got, 0);
  const next = [...parts].filter((p) => p.got < p.max).sort((a, b) => b.max - b.got - (a.max - a.got))[0] ?? null;
  return { score, parts, next };
}

/** كم مرة فوّت يومين ورا بعض. days = أيام العمل كـ yyyy-mm-dd مرتبة، من أول يوم ممكن لليوم */
export function countDoubleMisses(done: Set<string>, allDays: string[]): number {
  let n = 0, run = 0;
  for (const d of allDays) {
    if (done.has(d)) run = 0;
    else if (++run === 2) n++;
  }
  return n;
}

export const cleanFact = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 280);
