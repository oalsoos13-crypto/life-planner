import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { toYmd } from "@/lib/dates";

const STATUS: Record<string, string> = { NOT_STARTED: "ما بلّشت", IN_PROGRESS: "ماشية", DONE: "خلصت" };
const d = (x: Date | null | undefined) => (x ? toYmd(x) : "");

export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "خطتي";

  const add = (name: string, cols: [string, number][], rows: (string | number | null)[][]) => {
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map(([header, width]) => ({ header, width }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
  };

  const tasks = await prisma.weeklyTask.findMany({
    include: { goal: { include: { pillar: true } }, steps: true },
    orderBy: [{ weekStart: "asc" }, { order: "asc" }],
  });
  add(
    "المهام الأسبوعية",
    [["الأسبوع", 12], ["المهمة", 40], ["المحور", 14], ["الهدف", 30], ["الحالة", 10], ["ملغاة", 20], ["عالقة", 20], ["نسبة", 8], ["خطوات", 10], ["مرحّلة", 8], ["ملاحظات", 40]],
    tasks.map((t) => [
      d(t.weekStart), t.title, t.goal?.pillar.name ?? "اعتيادي", t.goal?.title ?? "", STATUS[t.status],
      t.cancelledAt ? t.cancelReason ?? "نعم" : "", t.stuck ? t.stuckNote ?? "نعم" : "", t.progress,
      t.steps.length ? `${t.steps.filter((s) => s.done).length}/${t.steps.length}` : "", t.carryCount || "", t.notes ?? "",
    ])
  );

  const goals = await prisma.goal.findMany({ include: { pillar: true, cycle: true }, orderBy: [{ pillar: { order: "asc" } }, { order: "asc" }] });
  add(
    "الأهداف",
    [["الدورة", 20], ["المحور", 14], ["الهدف", 40], ["الوزن", 7], ["الاستحقاق", 12], ["المؤشر", 22], ["الوحدة", 10], ["البداية", 9], ["الهدف", 9], ["الاتجاه", 8], ["مؤرشف", 8]],
    goals.map((g) => [g.cycle.name, g.pillar.name, g.title, g.weight, d(g.dueDate), g.kpiName ?? "", g.kpiUnit ?? "", g.kpiStart, g.kpiTarget, g.kpiDirection === "DOWN" ? "↓" : g.kpiDirection ? "↑" : "", g.archived ? "نعم" : ""])
  );

  const subs = await prisma.planSubtask.findMany({ include: { planTask: { include: { goal: true } }, steps: true }, orderBy: { dueDate: "asc" } });
  const planRows: (string | number | null)[][] = [];
  for (const s of subs) {
    planRows.push([s.planTask.goal.title, s.planTask.title, s.title, "", d(s.dueDate), STATUS[s.status]]);
    for (const st of s.steps) planRows.push([s.planTask.goal.title, s.planTask.title, s.title, st.title, d(st.dueDate), STATUS[st.status]]);
  }
  add("الخطة", [["الهدف", 30], ["المهمة", 30], ["المهمة الصغيرة", 30], ["الخطوة", 20], ["الموعد", 12], ["الحالة", 10]], planRows);

  const readings = await prisma.kpiReading.findMany({ include: { goal: true }, orderBy: { weekStart: "asc" } });
  add("قراءات المؤشرات", [["الأسبوع", 12], ["الهدف", 30], ["المؤشر", 20], ["القيمة", 10]], readings.map((r) => [d(r.weekStart), r.goal.title, r.goal.kpiName ?? "", r.value]));

  const reviews = await prisma.weekReview.findMany({ orderBy: { weekStart: "asc" } });
  add("المراجعات", [["الأسبوع", 12], ["شو تعلّمت", 50], ["أهم 3", 50]], reviews.map((r) => [d(r.weekStart), r.learned ?? "", Array.isArray(r.top3) ? (r.top3 as string[]).filter(Boolean).join(" | ") : ""]));

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="khutati-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
