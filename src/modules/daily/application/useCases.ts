// حالات استخدام «اليوم»: كتابة بس، كل وحدة بتتحقق بالمجال قبل قاعدة البيانات
import "server-only";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { isValidYmd, toDate, type Ymd } from "@/shared/kernel/dates";
import { clampScale, cleanIntent } from "../domain/day";

export async function setIntent(date: Ymd, text: string): Promise<Result<void>> {
  if (!isValidYmd(date)) return err("DATE", "تاريخ مش صحيح");
  const intent = cleanIntent(text);
  await prisma.dayLog.upsert({ where: { date: toDate(date) }, update: { intent }, create: { date: toDate(date), intent } });
  return ok(undefined);
}

export async function setFeeling(date: Ymd, field: "energy" | "mood", value: number | null): Promise<Result<void>> {
  if (!isValidYmd(date)) return err("DATE", "تاريخ مش صحيح");
  const v = clampScale(value);
  await prisma.dayLog.upsert({ where: { date: toDate(date) }, update: { [field]: v }, create: { date: toDate(date), [field]: v } });
  return ok(undefined);
}

export async function setEvening(date: Ymd, text: string): Promise<Result<void>> {
  if (!isValidYmd(date)) return err("DATE", "تاريخ مش صحيح");
  const evening = text.trim() || null;
  await prisma.dayLog.upsert({ where: { date: toDate(date) }, update: { evening }, create: { date: toDate(date), evening } });
  return ok(undefined);
}

/** كبسة على العادة: بتنعمل أو بتنشال لليوم. إذا مربوطة بمؤشر، المؤشر بيتحدّث معها */
export async function toggleHabit(habitId: string, date: Ymd, done: boolean): Promise<Result<void>> {
  if (!isValidYmd(date)) return err("DATE", "تاريخ مش صحيح");
  const d = toDate(date);
  await prisma.$transaction(async (tx) => {
    if (done) await tx.habitCheck.upsert({ where: { habitId_date: { habitId, date: d } }, update: {}, create: { habitId, date: d } });
    else await tx.habitCheck.deleteMany({ where: { habitId, date: d } });
  });
  return ok(undefined);
}

export async function addHabit(name: string, icon: string, pillarId: string | null): Promise<Result<void>> {
  const n = name.trim();
  if (!n) return err("NAME", "اكتب اسم العادة");
  const count = await prisma.habit.count({ where: { archived: false } });
  await prisma.habit.create({ data: { name: n.slice(0, 40), icon, pillarId, order: count } });
  return ok(undefined);
}

export async function archiveHabit(habitId: string): Promise<Result<void>> {
  await prisma.habit.update({ where: { id: habitId }, data: { archived: true } });
  return ok(undefined);
}

/** الالتقاط: بينحفظ النص كما هو بالصندوق، والمستشار بيفرزه بمرحلته (المخطط: الالتقاط) */
export async function capture(text: string, source: "TEXT" | "VOICE"): Promise<Result<{ id: string }>> {
  const t = text.trim();
  if (!t) return err("EMPTY", "ما في شي ينحفظ");
  const c = await prisma.capture.create({ data: { text: t.slice(0, 20000), source } });
  return ok({ id: c.id });
}
