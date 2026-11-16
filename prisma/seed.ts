// خطة عمر المعتمدة (الدورة الأولى). بيشتغل مرة وحدة بس: إذا في دورة موجودة ما بيعمل شي.
import { PrismaClient, KpiDirection } from "@prisma/client";

const prisma = new PrismaClient();
const D = (s: string) => new Date(s + "T00:00:00.000Z");

type Sub = { t: string; due?: string; steps?: { t: string; due?: string }[] };
type GoalSeed = {
  key: string;
  title: string;
  weight: number;
  notes?: string;
  due?: string;
  kpi?: { name: string; unit: string; start: number | null; target: number | null; dir: KpiDirection };
  plan?: { t: string; subs: Sub[] }[];
};
type PillarSeed = { name: string; color: string; goals: GoalSeed[] };

const UP = KpiDirection.UP;
const DOWN = KpiDirection.DOWN;

const pillars: PillarSeed[] = [
  {
    name: "«المجدّد»",
    color: "#059669",
    goals: [
      {
        key: "users",
        title: "1000 مستخدم نشط قبل رمضان",
        weight: 5,
        due: "2027-02-07",
        kpi: { name: "مستخدمون نشطون", unit: "مستخدم", start: 0, target: 1000, dir: UP },
        plan: [
          {
            t: "الإطلاق على Google Play (ديسمبر)",
            subs: [
              { t: "صفحة المتجر والوصف", due: "2026-12-05" },
              { t: "لقطات الشاشة", due: "2026-12-05" },
              { t: "سياسة الخصوصية", due: "2026-12-05" },
              { t: "التأكد من حقوق خط المصحف والتلاوات", due: "2026-12-12" },
              { t: "نشر التطبيق على Google Play", due: "2026-12-19" },
            ],
          },
          {
            t: "تجربة بيتا مع 20 شخص (ديسمبر)",
            subs: [
              { t: "جمع 20 مجرّب", due: "2026-12-12" },
              { t: "جمع الملاحظات", due: "2026-12-26" },
              { t: "إصلاح الأخطاء", due: "2026-12-31" },
            ],
          },
          {
            t: "التسويق بالفيديو (يناير): فيديوهين قصار بالأسبوع",
            subs: [
              { t: "فيديو: التحقق من التلاوة", due: "2027-01-09" },
              { t: "فيديو: عدّاد الركعات", due: "2027-01-09" },
              {
                t: "نشر فيديوهين كل أسبوع على TikTok و Reels",
                due: "2027-01-31",
                steps: [
                  { t: "الأسبوع 1", due: "2027-01-09" },
                  { t: "الأسبوع 2", due: "2027-01-16" },
                  { t: "الأسبوع 3", due: "2027-01-23" },
                  { t: "الأسبوع 4", due: "2027-01-30" },
                ],
              },
            ],
          },
          {
            t: "الوصول لحلقات التحفيظ (يناير)",
            subs: [
              { t: "قائمة بـ 10 حلقات قرآن", due: "2027-01-09" },
              { t: "التواصل مع الحلقات العشرة", due: "2027-01-31" },
            ],
          },
          {
            t: "حملة «ختمة رمضان» (فبراير)",
            subs: [
              { t: "تجهيز محتوى الحملة", due: "2027-02-01" },
              { t: "إطلاق الحملة", due: "2027-02-06" },
            ],
          },
        ],
      },
      {
        key: "subs",
        title: "أول 20 مشترك",
        weight: 5,
        due: "2027-02-20",
        kpi: { name: "مشتركون", unit: "مشترك", start: 0, target: 20, dir: UP },
        plan: [
          {
            t: "تفعيل الاشتراك (فبراير)",
            subs: [
              { t: "تحديد السعر والمزايا", due: "2027-01-24" },
              { t: "ربط الدفع داخل التطبيق", due: "2027-02-04" },
              { t: "تفعيل الاشتراك", due: "2027-02-06" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "المال",
    color: "#d97706",
    goals: [
      {
        key: "expenses",
        title: "تسجيل كل مصروف (أول شهر)",
        weight: 5,
        due: "2026-12-21",
        kpi: { name: "أيام التسجيل بالأسبوع", unit: "يوم", start: 0, target: 7, dir: UP },
        plan: [{ t: "نظام تسجيل المصاريف", subs: [{ t: "اختيار طريقة التسجيل (تطبيق أو جدول)", due: "2026-11-28" }] }],
      },
      {
        key: "debt",
        title: "سداد الديون للأصدقاء والأقارب تدريجياً",
        weight: 5,
        due: "2027-02-20",
        notes: "الدين حوالي 500 د.ك. الهدف بنهاية الدورة يكون المتبقي حوالي 250.",
        kpi: { name: "المتبقي من الدين", unit: "د.ك", start: 500, target: 250, dir: DOWN },
        plan: [
          {
            t: "خطة السداد",
            subs: [
              { t: "قائمة بكل الديون والمبالغ", due: "2026-11-28" },
              { t: "جدول دفعات شهري", due: "2026-12-05" },
              { t: "دفعة ديسمبر", due: "2026-12-31" },
              { t: "دفعة يناير", due: "2027-01-31" },
              { t: "دفعة فبراير", due: "2027-02-20" },
            ],
          },
        ],
      },
      { key: "nodebt", title: "لا ديون جديدة", weight: 5, notes: "مبدأ ثابت طول الدورة." },
      {
        key: "raise",
        title: "طلب زيادة أو مكافأة في لطيفة كافيه",
        weight: 4,
        due: "2027-01-31",
        plan: [
          {
            t: "ملف النتائج",
            subs: [
              { t: "جمع أرقامي وإنجازاتي", due: "2026-12-19" },
              { t: "تجهيز ملف النتائج", due: "2027-01-09" },
              { t: "طلب اجتماع وطرح الزيادة", due: "2027-01-16" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "الصحة",
    color: "#e11d48",
    goals: [
      {
        key: "checkup",
        title: "فحص طبي شامل",
        weight: 4,
        due: "2026-12-31",
        plan: [
          {
            t: "الفحص الطبي (ديسمبر)",
            subs: [
              { t: "حجز موعد", due: "2026-11-28" },
              { t: "إجراء الفحص", due: "2026-12-19" },
              { t: "مراجعة النتائج مع الطبيب", due: "2026-12-31" },
            ],
          },
        ],
      },
      {
        key: "sleep",
        title: "النوم بكير",
        weight: 4,
        notes: "أول شهر قبل 12:30، وبعدها قبل 12.",
        kpi: { name: "ليالي النوم بالموعد", unit: "ليلة/أسبوع", start: 0, target: 5, dir: UP },
      },
      {
        key: "walk",
        title: "المشي 20 دقيقة 3 مرات بالأسبوع",
        weight: 4,
        kpi: { name: "مرات المشي", unit: "مرة/أسبوع", start: 0, target: 3, dir: UP },
      },
      {
        key: "delivery",
        title: "تقليل طلبات الدليفري",
        weight: 3,
        notes: "أول شهر 3 بالأسبوع، وبعدها 2. قيمة البداية: سجّل كم طلب حالياً.",
        kpi: { name: "طلبات الدليفري", unit: "طلب/أسبوع", start: null, target: 2, dir: DOWN },
      },
      {
        key: "smoking",
        title: "تقليل التدخين: سيجارة أقل كل أسبوعين",
        weight: 4,
        kpi: { name: "سجائر باليوم", unit: "سيجارة", start: 20, target: 14, dir: DOWN },
      },
      { key: "coffee", title: "لا قهوة بعد 6 المسا", weight: 2 },
      {
        key: "weight",
        title: "نزول 5 كيلو",
        weight: 3,
        notes: "سجّل وزنك الحالي كقيمة بداية، والهدف = البداية ناقص 5.",
        kpi: { name: "الوزن", unit: "كغ", start: null, target: null, dir: DOWN },
      },
    ],
  },
  {
    name: "العمل",
    color: "#2563eb",
    goals: [
      {
        key: "manager",
        title: "اجتماع مع مديري في United Co. عن مسار التطوّر",
        weight: 3,
        due: "2026-12-24",
        plan: [
          {
            t: "الاجتماع",
            subs: [
              { t: "تحضير نقاط الاجتماع", due: "2026-12-10" },
              { t: "طلب الاجتماع وعقده", due: "2026-12-24" },
            ],
          },
        ],
      },
      {
        key: "achievements",
        title: "توثيق إنجازاتي كل شهر",
        weight: 3,
        plan: [
          {
            t: "سجل الإنجازات",
            subs: [
              { t: "إنجازات ديسمبر", due: "2026-12-31" },
              { t: "إنجازات يناير", due: "2027-01-31" },
              { t: "إنجازات فبراير", due: "2027-02-20" },
            ],
          },
        ],
      },
      {
        key: "legal",
        title: "التأكد من الوضع القانوني للإقامة والعمل الثاني",
        weight: 3,
        due: "2026-12-15",
        plan: [{ t: "الاستشارة", subs: [{ t: "سؤال جهة مختصة أو محامي", due: "2026-12-15" }] }],
      },
    ],
  },
  {
    name: "العلاقات",
    color: "#db2777",
    goals: [
      {
        key: "family",
        title: "اتصال بالعيلة كل جمعة",
        weight: 3,
        kpi: { name: "اتصال الجمعة", unit: "مرة/أسبوع", start: 0, target: 1, dir: UP },
      },
      {
        key: "social",
        title: "نشاط اجتماعي كل أسبوع",
        weight: 3,
        kpi: { name: "أنشطة اجتماعية", unit: "نشاط/أسبوع", start: 0, target: 1, dir: UP },
      },
    ],
  },
  {
    name: "الروحانيات",
    color: "#0d9488",
    goals: [
      {
        key: "quran",
        title: "صفحة قرآن يومياً من تطبيقي",
        weight: 2,
        kpi: { name: "أيام القراءة", unit: "يوم/أسبوع", start: 0, target: 7, dir: UP },
      },
    ],
  },
  {
    name: "التعلّم",
    color: "#4f46e5",
    goals: [
      {
        key: "podcast",
        title: "3 حلقات بودكاست عن تسويق التطبيقات بالأسبوع",
        weight: 2,
        notes: "بالطريق للشغل.",
        kpi: { name: "حلقات", unit: "حلقة/أسبوع", start: 0, target: 3, dir: UP },
      },
    ],
  },
  {
    name: "الهوايات",
    color: "#9333ea",
    goals: [
      {
        key: "hobby",
        title: "تجربة نشاط جديد كل شهر",
        weight: 1,
        plan: [
          {
            t: "نشاط كل شهر",
            subs: [
              { t: "نشاط ديسمبر", due: "2026-12-31" },
              { t: "نشاط يناير", due: "2027-01-31" },
              { t: "نشاط فبراير", due: "2027-02-20" },
            ],
          },
        ],
      },
    ],
  },
];

// «بيدعم»
const supports: [string, string][] = [
  ["sleep", "walk"],
  ["sleep", "users"],
  ["delivery", "weight"],
  ["delivery", "debt"],
  ["smoking", "walk"],
  ["smoking", "debt"],
  ["quran", "users"],
  ["podcast", "users"],
];

// المهام المتكررة كل أسبوع (بتبلّش من أول أسبوع بالدورة)
const recurring: { t: string; goal?: string; notes?: string; steps?: string[] }[] = [
  { t: "سجّل كل مصاريفك يومياً", goal: "expenses" },
  { t: "مشي 20 دقيقة", goal: "walk", notes: "أنسب وقت: الجمعة والسبت الصبح.", steps: ["المرة 1", "المرة 2", "المرة 3"] },
  { t: "صفحة قرآن يومياً من «المجدّد»", goal: "quran" },
  { t: "3 حلقات بودكاست بالطريق", goal: "podcast", steps: ["حلقة 1", "حلقة 2", "حلقة 3"] },
  { t: "اتصال بالعيلة يوم الجمعة", goal: "family" },
  { t: "نشاط اجتماعي", goal: "social" },
  { t: "مراجعة الأسبوع وتسجيل قراءات المؤشرات (الجمعة/السبت)" },
];

// مهام أول أسبوع (22 نوفمبر) مربوطة بخطوات من الخطة
const firstWeek: { t: string; goal: string; sub: string }[] = [
  { t: "احجز موعد الفحص الطبي الشامل", goal: "checkup", sub: "حجز موعد" },
  { t: "اكتب قائمة بكل الديون والمبالغ", goal: "debt", sub: "قائمة بكل الديون والمبالغ" },
  { t: "اختار طريقة تسجيل المصاريف", goal: "expenses", sub: "اختيار طريقة التسجيل (تطبيق أو جدول)" },
  { t: "ابدأ صفحة «المجدّد» على Google Play", goal: "users", sub: "صفحة المتجر والوصف" },
];

async function main() {
  const existing = await prisma.cycle.count();
  if (existing > 0) {
    console.log("في بيانات موجودة، ما رح أعمل seed.");
    return;
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const cycle = await prisma.cycle.create({
    data: { name: "الدورة الأولى: ربع سنة لحد رمضان", startDate: D("2026-11-22"), endDate: D("2027-02-20") },
  });

  const goalIds: Record<string, string> = {};
  const subIds: Record<string, string> = {};

  for (const [pi, p] of pillars.entries()) {
    const pillar = await prisma.pillar.create({ data: { name: p.name, color: p.color, order: pi } });
    for (const [gi, g] of p.goals.entries()) {
      const goal = await prisma.goal.create({
        data: {
          cycleId: cycle.id,
          pillarId: pillar.id,
          title: g.title,
          notes: g.notes,
          weight: g.weight,
          order: gi,
          dueDate: g.due ? D(g.due) : null,
          kpiName: g.kpi?.name,
          kpiUnit: g.kpi?.unit,
          kpiStart: g.kpi?.start ?? null,
          kpiTarget: g.kpi?.target ?? null,
          kpiDirection: g.kpi?.dir,
        },
      });
      goalIds[g.key] = goal.id;
      for (const [ti, t] of (g.plan ?? []).entries()) {
        const pt = await prisma.planTask.create({ data: { goalId: goal.id, title: t.t, order: ti } });
        for (const [si, s] of t.subs.entries()) {
          const sub = await prisma.planSubtask.create({
            data: {
              planTaskId: pt.id,
              title: s.t,
              order: si,
              dueDate: s.due ? D(s.due) : null,
              steps: s.steps
                ? { create: s.steps.map((st, i) => ({ title: st.t, order: i, dueDate: st.due ? D(st.due) : null })) }
                : undefined,
            },
          });
          subIds[`${g.key}:${s.t}`] = sub.id;
        }
      }
    }
  }

  for (const [from, to] of supports) {
    await prisma.goalSupport.create({ data: { fromId: goalIds[from], toId: goalIds[to] } });
  }

  const startWeek = D("2026-11-22");
  for (const r of recurring) {
    await prisma.recurrence.create({
      data: { title: r.t, goalId: r.goal ? goalIds[r.goal] : null, notes: r.notes, steps: r.steps ?? [], startWeek },
    });
  }

  for (const [i, f] of firstWeek.entries()) {
    await prisma.weeklyTask.create({
      data: {
        weekStart: startWeek,
        title: f.t,
        goalId: goalIds[f.goal],
        planSubtaskId: subIds[`${f.goal}:${f.sub}`],
        order: i,
      },
    });
  }

  console.log("تمّ تحميل الخطة ✓");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
