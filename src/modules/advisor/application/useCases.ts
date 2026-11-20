// الالتقاط الذكي: بيفهم الكلام، بيطبّقه لحاله (بدون شاشة تأكيد)، وبيحفظ لكل عنصر طريقة التراجع (Command، Microinteractions: Undo بدل تأكيد)
import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { toDate, type Ymd } from "@/shared/kernel/dates";
import { chainFor, ruleExtract, sanitize, type Extracted } from "../domain/capture";
import { askClaude, extractWithClaude, hasKey, type ChatTurn } from "./claude";
import { loadContext } from "./context";

type Tx = Prisma.TransactionClient;
type Undo =
  | { t: "deleteTask"; id: string }
  | { t: "deleteHabitCheck"; habitId: string; date: string }
  | { t: "deleteExpense"; id: string }
  | { t: "restoreReading"; metricId: string; date: string; prev: number | null }
  | { t: "restoreDay"; date: string; field: "energy" | "mood"; prev: number | null }
  | { t: "none" };

export type AppliedItem = { id: string; kind: string; summary: string; chain: string | null };

async function applyOne(tx: Tx, it: Extracted, today: Ymd, week: Ymd): Promise<{ refType: string | null; refId: string | null; undo: Undo; summary: string }> {
  const d = toDate(today);
  switch (it.kind) {
    case "TASK": {
      const t = await tx.weeklyTask.create({ data: { weekStart: toDate(week), title: it.title, goalId: it.goalId, touchedAt: new Date() } });
      return { refType: "WeeklyTask", refId: t.id, undo: { t: "deleteTask", id: t.id }, summary: it.title };
    }
    case "HABIT": {
      const exists = await tx.habitCheck.findUnique({ where: { habitId_date: { habitId: it.habitId!, date: d } } });
      if (!exists) await tx.habitCheck.create({ data: { habitId: it.habitId!, date: d } });
      return { refType: "Habit", refId: it.habitId, undo: exists ? { t: "none" } : { t: "deleteHabitCheck", habitId: it.habitId!, date: today }, summary: it.title };
    }
    case "EXPENSE": {
      const e = await tx.expense.create({ data: { date: d, amount: it.amount!, category: it.category ?? "متفرقات", note: it.title } });
      return { refType: "Expense", refId: e.id, undo: { t: "deleteExpense", id: e.id }, summary: `${it.amount} د.ك · ${it.category ?? "متفرقات"}` };
    }
    case "METRIC": {
      const prev = await tx.metricReading.findUnique({ where: { metricId_date: { metricId: it.metricId!, date: d } } });
      await tx.metricReading.upsert({
        where: { metricId_date: { metricId: it.metricId!, date: d } },
        update: { value: it.value!, source: "CAPTURE" },
        create: { metricId: it.metricId!, date: d, value: it.value!, source: "CAPTURE" },
      });
      return { refType: "Metric", refId: it.metricId, undo: { t: "restoreReading", metricId: it.metricId!, date: today, prev: prev?.value ?? null }, summary: it.title };
    }
    case "ENERGY":
    case "MOOD": {
      const field = it.kind === "ENERGY" ? "energy" : "mood";
      const prev = await tx.dayLog.findUnique({ where: { date: d } });
      await tx.dayLog.upsert({ where: { date: d }, update: { [field]: it.value }, create: { date: d, [field]: it.value } });
      return { refType: "DayLog", refId: today, undo: { t: "restoreDay", date: today, field, prev: prev?.[field] ?? null }, summary: it.title };
    }
    default:
      return { refType: it.goalId ? "Goal" : null, refId: it.goalId, undo: { t: "none" }, summary: it.title };
  }
}

/** بيحفظ الكلام، بيفهمه (Claude أو القواعد)، وبيطبّق كل عنصر بمعاملة وحدة */
export async function captureAndApply(text: string, source: "TEXT" | "VOICE", today: Ymd, week: Ymd): Promise<Result<{ analyzer: string; items: AppliedItem[] }>> {
  const t = text.trim();
  if (!t) return err("EMPTY", "ما في شي ينحفظ");
  const cap = await prisma.capture.create({ data: { text: t.slice(0, 20000), source } });
  const ctx = await loadContext(today);
  let raw: Extracted[] | null = null;
  let analyzer = "RULES";
  let error: string | null = null;
  if (hasKey()) {
    try {
      raw = await extractWithClaude(t, ctx);
      if (raw) analyzer = "CLAUDE";
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 300) : "خطأ";
    }
  }
  const items = sanitize(raw ?? ruleExtract(t, ctx), ctx);
  const applied = await prisma.$transaction(async (tx) => {
    const out: AppliedItem[] = [];
    for (const it of items) {
      const r = await applyOne(tx, it, today, week);
      const chain = chainFor(it, ctx);
      const row = await tx.captureItem.create({ data: { captureId: cap.id, kind: it.kind, summary: r.summary, chain, refType: r.refType, refId: r.refId, undo: r.undo } });
      out.push({ id: row.id, kind: it.kind, summary: r.summary, chain });
    }
    await tx.capture.update({ where: { id: cap.id }, data: { processedAt: new Date(), analyzer, error } });
    return out;
  });
  return ok({ analyzer, items: applied });
}

/** تراجع عن عنصر واحد: بيرجّع الشي متل ما كان */
export async function undoItem(id: string): Promise<Result<void>> {
  const item = await prisma.captureItem.findUnique({ where: { id } });
  if (!item) return err("NOT_FOUND", "مش موجود");
  if (item.undoneAt) return ok(undefined);
  const u = (item.undo ?? { t: "none" }) as Undo;
  await prisma.$transaction(async (tx) => {
    switch (u.t) {
      case "deleteTask":
        await tx.weeklyTask.deleteMany({ where: { id: u.id } });
        break;
      case "deleteHabitCheck":
        await tx.habitCheck.deleteMany({ where: { habitId: u.habitId, date: toDate(u.date) } });
        break;
      case "deleteExpense":
        await tx.expense.deleteMany({ where: { id: u.id } });
        break;
      case "restoreReading":
        if (u.prev == null) await tx.metricReading.deleteMany({ where: { metricId: u.metricId, date: toDate(u.date) } });
        else await tx.metricReading.update({ where: { metricId_date: { metricId: u.metricId, date: toDate(u.date) } }, data: { value: u.prev } });
        break;
      case "restoreDay":
        await tx.dayLog.updateMany({ where: { date: toDate(u.date) }, data: { [u.field]: u.prev } });
        break;
    }
    await tx.captureItem.update({ where: { id }, data: { undoneAt: new Date() } });
  });
  return ok(undefined);
}

/** سؤال للمستشار. بيتذكّر آخر 20 رسالة، وبيشوف سياقك اليوم */
export async function ask(question: string, today: Ymd): Promise<Result<string>> {
  const q = question.trim().slice(0, 4000);
  if (!q) return err("EMPTY", "اكتب سؤالك");
  if (!hasKey()) return err("NO_KEY", "المستشار لسا مش موصول. لازم مفتاح Claude بإعدادات السيرفر (ANTHROPIC_API_KEY).");
  const [ctx, last, day, items, facts, people] = await Promise.all([
    loadContext(today),
    prisma.advisorMessage.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.dayLog.findUnique({ where: { date: toDate(today) } }),
    prisma.captureItem.findMany({ where: { createdAt: { gte: toDate(today) }, undoneAt: null }, orderBy: { createdAt: "asc" }, take: 40 }),
    // الملف الحي: الي أكّده عمر أول، وما بنبعت المرفوض أبداً
    prisma.profileFact.findMany({ where: { status: { not: "REJECTED" } }, orderBy: [{ status: "asc" }, { confidence: "desc" }], take: 30 }),
    prisma.person.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }),
  ]);
  const history: ChatTurn[] = last.reverse().map((m) => ({ role: m.role as ChatTurn["role"], text: m.text }));
  const contextJson = JSON.stringify({ ...ctx, نية_اليوم: day?.intent, الطاقة: day?.energy, سجل_اليوم: items.map((i) => `${i.kind}: ${i.summary}`),
    شو_بعرف_عنه: facts.map((f) => `${f.status === "CONFIRMED" ? "✓" : "؟"} ${f.text}`),
    ناسه: people.map((p) => [p.name, p.relation, p.note].filter(Boolean).join(" · ")),
  });
  let answer: string | null;
  try {
    answer = await askClaude(history, q, contextJson);
  } catch (e) {
    return err("API", e instanceof Error ? `ما قدرت أوصل للمستشار: ${e.message.slice(0, 200)}` : "ما قدرت أوصل للمستشار");
  }
  if (!answer) return err("REFUSED", "المستشار ما قدر يجاوب على هالسؤال. جرّب تصيغه بطريقة تانية.");
  await prisma.advisorMessage.createMany({ data: [{ role: "user", text: q }, { role: "assistant", text: answer }] });
  return ok(answer);
}
