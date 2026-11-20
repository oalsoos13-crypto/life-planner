// مسودة الاستراتيجية (منهجية المرحلة 2، القسم 4) بعلامة «مسودة، راجعها».
// متكرّرة بأمان (idempotent): إذا الدورة إلها نواة، ما بتعمل شي. ما بتحذف ولا شي من خطتك.
import { PrismaClient, type Perspective } from "@prisma/client";

const D = (s: string) => new Date(s + "T00:00:00.000Z");

// باليتة المحاور الجديدة (دليل الواجهات §3.3). بتغيّر اللون بس إذا لسا اللون القديم الافتراضي،
// فإذا إنت غيّرته بإيدك ما بتلمسه.
const PALETTE: Record<string, [string, string]> = {
  "«المجدّد»": ["#059669", "#0f766e"],
  "المال": ["#d97706", "#a87b00"],
  "الصحة": ["#e11d48", "#d03b3b"],
  "العمل": ["#2563eb", "#2f6fdb"],
  "العلاقات": ["#db2777", "#c23b78"],
  "الروحانيات": ["#0d9488", "#4d7c0f"],
  "التعلّم": ["#4f46e5", "#7c3aed"],
  "الهوايات": ["#9333ea", "#d9601f"],
};

export async function applyPalette(prisma: PrismaClient) {
  for (const [name, [oldC, newC]] of Object.entries(PALETTE))
    await prisma.pillar.updateMany({ where: { name, color: oldC }, data: { color: newC } });
}

export async function seedPhase2(prisma: PrismaClient) {
  await applyPalette(prisma);
  const cycle = await prisma.cycle.findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "asc" } });
  if (!cycle) return console.log("ما في دورة نشطة، ما في مسودة استراتيجية.");
  if (await prisma.strategyKernel.findUnique({ where: { cycleId: cycle.id } })) {
    return console.log("الاستراتيجية موجودة، ما رح ألمسها.");
  }

  await prisma.$transaction(async (tx) => {
    // المحاور تحت المنظورات (مسودة)
    const persp: Record<string, Perspective> = {
      "«المجدّد»": "IMPACT",
      "المال": "FINANCE",
      "الصحة": "SYSTEM",
      "العمل": "FINANCE",
      "العلاقات": "IMPACT",
      "الروحانيات": "SYSTEM",
      "التعلّم": "GROWTH",
      "الهوايات": "SYSTEM",
    };
    const pillars = await tx.pillar.findMany();
    for (const p of pillars) if (persp[p.name] && !p.perspective) await tx.pillar.update({ where: { id: p.id }, data: { perspective: persp[p.name] } });
    const pillarId = (name: string) => pillars.find((p) => p.name === name)?.id ?? null;

    // النواة (Rumelt)
    await tx.strategyKernel.create({
      data: {
        cycleId: cycle.id,
        isDraft: true,
        coreChallenge:
          "وقتي وطاقتي محصورين بنافذة وحدة بالأسبوع (صباح الجمعة والسبت)، والمجدّد والصحة والمال بيتنافسوا عليها.",
        guidingPolicy:
          "صباح الجمعة والسبت للمجدّد بس. الصحة بحدّها الأدنى اليومي مدموجة بالروتين، والمال بقواعد آلية ما بتحتاج وقت.",
        guidingPolicyNot: "مش عن طريق توزيع النافذة على 8 محاور، ولا عن طريق زيادة ساعات شغل.",
        essentialIntent: "1000 مستخدم نشط وأول 20 مشترك بالمجدّد قبل رمضان (8 فبراير 2027).",
        freeHours: 14,
      },
    });

    // الأهداف الاستراتيجية لـ 3 سنين (Balanced Scorecard شخصي)
    const horizon = D("2029-11-21");
    const sg: { key: string; p: Perspective; title: string; metric?: { name: string; unit: string; start: number; target: number | null; dir: "UP" | "DOWN" } }[] = [
      { key: "fin", p: "FINANCE", title: "دخل المشروع ≥ دخل الوظيفة، وصفر ديون مع صندوق طوارئ", metric: { name: "دخل المجدّد الشهري", unit: "د.ك", start: 0, target: null, dir: "UP" } },
      { key: "imp", p: "IMPACT", title: "قاعدة مستخدمين ومشتركين مخلصين للمجدّد", metric: { name: "مشتركون مدفوعون", unit: "مشترك", start: 0, target: null, dir: "UP" } },
      { key: "health", p: "SYSTEM", title: "صحة وطاقة ثابتة (نوم، حركة، وزن)" },
      { key: "sys", p: "SYSTEM", title: "نظام أسبوعي بيحمي وقت المشروع" },
      { key: "grow", p: "GROWTH", title: "مهارات النمو والتسويق للمنتجات الرقمية" },
    ];
    const sgId: Record<string, string> = {};
    for (const [i, g] of sg.entries()) {
      const row = await tx.strategicGoal.create({
        data: {
          perspective: g.p,
          title: g.title,
          horizonEnd: horizon,
          order: i,
          isDraft: true,
          metrics: g.metric
            ? { create: { name: g.metric.name, unit: g.metric.unit, start: g.metric.start, target: g.metric.target, direction: g.metric.dir } }
            : undefined,
        },
      });
      sgId[g.key] = row.id;
    }

    // OKRs الربع: منرقّي أهداف موجودة (ADR-004) بدل ما نعمل أهداف جديدة، عشان المهام والخطة مربوطة فيها
    const goals = await tx.goal.findMany({ where: { cycleId: cycle.id }, include: { metrics: true } });
    const byTitle = (t: string) => goals.find((g) => g.title === t);
    const moveMetric = async (fromTitle: string, toId: string, order: number) => {
      const g = byTitle(fromTitle);
      const m = g?.metrics[0];
      if (m) await tx.metric.update({ where: { id: m.id }, data: { goalId: toId, order } });
    };

    const okrs = [
      {
        from: "1000 مستخدم نشط قبل رمضان",
        title: "أطلق المجدّد وأثبت إن الناس بتدفع",
        type: "COMMITTED" as const,
        sg: "imp",
        move: ["أول 20 مشترك"],
        extra: [{ name: "نسبة الرجوع بعد أسبوع", unit: "%", start: 0, target: null, dir: "UP" as const, role: "LEADING" as const }],
      },
      {
        from: "النوم بكير",
        title: "حد أدنى صحي ثابت",
        type: "COMMITTED" as const,
        sg: "health",
        move: ["المشي 20 دقيقة 3 مرات بالأسبوع", "نزول 5 كيلو"],
        extra: [],
      },
      {
        from: "سداد الديون للأصدقاء والأقارب تدريجياً",
        title: "ابدأ ينزل الدين",
        type: "ASPIRATIONAL" as const,
        sg: "fin",
        move: ["تسجيل كل مصروف (أول شهر)"],
        extra: [],
      },
    ];
    for (const [i, o] of okrs.entries()) {
      const g = byTitle(o.from);
      if (!g) continue;
      await tx.goal.update({
        where: { id: g.id },
        data: {
          kind: "OKR",
          rank: i + 1,
          okrType: o.type,
          title: o.title,
          strategicGoalId: sgId[o.sg],
          notes: [g.notes, `مسودة من المنهجية. كان اسمه: «${g.title}».`].filter(Boolean).join("\n"),
        },
      });
      for (const [j, t] of o.move.entries()) await moveMetric(t, g.id, j + 1);
      for (const [j, m] of o.extra.entries())
        await tx.metric.create({ data: { goalId: g.id, name: m.name, unit: m.unit, start: m.start, target: m.target, direction: m.dir, role: m.role, order: 10 + j } });
    }

    // قائمة «لا» (Essentialism: التقصير الاستراتيجي بدون ذنب)
    const no: { text: string; reason: string; pillar?: string }[] = [
      { text: "iOS والسوق الإنجليزي للمجدّد", reason: "أندرويد والمستخدم العربي أولاً لحد ما يثبت", pillar: "«المجدّد»" },
      { text: "كورسات وتعلّم عام برّا تسويق التطبيقات", reason: "التعلّم هالربع بيخدم OKR المجدّد بس", pillar: "التعلّم" },
      { text: "أي فرصة أو مشروع جانبي جديد علامته أقل من 9 من 10", reason: "قاعدة 90% (Essentialism)" },
      { text: "الهوايات فوق نشاط واحد بالشهر", reason: "حد أدنى عن قصد هالربع", pillar: "الهوايات" },
    ];
    for (const [i, n] of no.entries())
      await tx.notDoing.create({ data: { cycleId: cycle.id, text: n.text, reason: n.reason, pillarId: n.pillar ? pillarId(n.pillar) : null, order: i } });
  });
  console.log("تمّت مسودة الاستراتيجية ✓");
}
