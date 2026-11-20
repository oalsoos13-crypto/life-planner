import "server-only";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { addDays, dayOfWeek, isValidYmd, toDate, toYmd, type Ymd } from "@/shared/kernel/dates";
import { advisorConnected, learnProfileWithClaude } from "@/modules/advisor/server";
import { PROFILE_AREAS, cleanFact, countDoubleMisses, deriveFacts, type ProfileArea, type ProfileInput } from "../domain/profile";

const strip = (s: string) => s.replace(/[«»]/g, "");

/** بيجمع البيانات الخام للاستنتاج (آخر 60 يوم) */
async function loadInput(today: Ymd): Promise<ProfileInput> {
  const from60 = toDate(addDays(today, -60));
  const from28 = addDays(today, -28);
  const [days, habits, tasks, expenses] = await Promise.all([
    prisma.dayLog.findMany({ where: { date: { gte: from60, lt: toDate(today) } } }),
    prisma.habit.findMany({ where: { archived: false }, include: { checks: { where: { date: { gte: toDate(from28) } } } } }),
    prisma.weeklyTask.findMany({
      where: { weekStart: { gte: toDate(addDays(today, -91)) }, cancelledAt: null },
      select: { carryCount: true, stuck: true, status: true, completedAt: true, goal: { select: { pillar: { select: { name: true } } } } },
    }),
    prisma.expense.findMany({ where: { date: { gte: toDate(addDays(today, -30)) } }, select: { category: true, amount: true } }),
  ]);

  // أيام العادة: من يوم ما انعملت (أو قبل 28 يوم) لمبارح. اليوم لسا ما خلص
  const habitRows = habits.map((h) => {
    const start = toYmd(h.createdAt) > from28 ? toYmd(h.createdAt) : from28;
    const all: string[] = [];
    for (let d = start; d < today; d = addDays(d, 1)) all.push(d);
    const done = new Set(h.checks.map((c) => toYmd(c.date)));
    return { name: h.name, doneDays: all.filter((d) => done.has(d)).length, possibleDays: all.length, misses2: countDoubleMisses(done, all) };
  });

  return {
    days: days.map((d) => ({ weekday: dayOfWeek(toYmd(d.date)), energy: d.energy, mood: d.mood })),
    habits: habitRows,
    tasks: tasks.map((t) => ({
      pillar: t.goal?.pillar ? strip(t.goal.pillar.name) : null,
      carryCount: t.carryCount,
      stuck: t.stuck,
      done: t.status === "DONE",
      doneWeekday: t.completedAt ? dayOfWeek(toYmd(t.completedAt)) : null,
    })),
    expenses,
  };
}

/** بيحدّث الحقائق المستنتجة من البيانات. الي رفضه عمر بيضل مرفوض، والي صحّحه بإيده ما بنكتب فوقه */
export async function refreshFromData(today: Ymd): Promise<void> {
  if (!isValidYmd(today)) return;
  const derived = deriveFacts(await loadInput(today));
  const keys = derived.map((d) => d.key);
  const existing = await prisma.profileFact.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(existing.map((e) => [e.key, e]));
  await prisma.$transaction([
    ...derived.flatMap((d) => {
      const e = byKey.get(d.key);
      if (!e) return [prisma.profileFact.create({ data: { key: d.key, area: d.area, text: d.text, evidence: d.evidence, confidence: d.confidence, source: "DATA" } })];
      if (e.source === "ME" || e.status === "REJECTED") return [];
      // إذا تغيّر الاستنتاج نفسه، بيرجع «جديد» ليراجعه
      const changed = e.text !== d.text;
      return [prisma.profileFact.update({ where: { id: e.id }, data: { area: d.area, text: d.text, evidence: d.evidence, confidence: d.confidence, ...(changed ? { status: "NEW" } : {}) } })];
    }),
    // استنتاج ما عاد صحيح (البيانات تغيّرت): بنشيله إذا لسا ما أكّده
    prisma.profileFact.deleteMany({ where: { source: "DATA", status: "NEW", key: { notIn: keys.length ? keys : ["-"] } } }),
  ]);
}

/** Claude بيقرأ كلام آخر أسبوعين وبيزيد حقائق وناس. بدون مفتاح بيرجع خطأ واضح */
export async function learnFromCaptures(today: Ymd): Promise<Result<{ facts: number; people: number }>> {
  if (!advisorConnected()) return err("NO_KEY", "التعلّم من كلامك بيحتاج مفتاح Claude. لحد ما ينحط، التطبيق بيتعلّم من أرقامك بس.");
  const [caps, facts, people] = await Promise.all([
    prisma.capture.findMany({ where: { createdAt: { gte: toDate(addDays(today, -14)) } }, orderBy: { createdAt: "asc" }, take: 80, select: { text: true } }),
    prisma.profileFact.findMany({ select: { text: true, status: true } }),
    prisma.person.findMany({ select: { name: true } }),
  ]);
  if (caps.length < 2) return err("FEW", "لسا ما في كلام كفاية. احكي عن يومك كم مرة وجرّب بعدين.");
  let learned;
  try {
    learned = await learnProfileWithClaude({
      captures: caps.map((c) => c.text.slice(0, 2000)),
      known: facts.filter((f) => f.status !== "REJECTED").map((f) => f.text),
      rejected: facts.filter((f) => f.status === "REJECTED").map((f) => f.text),
      people: people.map((p) => p.name),
    });
  } catch (e) {
    return err("API", e instanceof Error ? `ما قدرت أوصل لـ Claude: ${e.message.slice(0, 200)}` : "ما قدرت أوصل لـ Claude");
  }
  if (!learned) return err("REFUSED", "ما قدرت أطلّع شي هالمرة.");
  const known = new Set(people.map((p) => p.name.trim()));
  const newFacts = learned.facts.slice(0, 6).filter((f) => PROFILE_AREAS.includes(f.area) && cleanFact(f.text));
  const newPeople = learned.people.filter((p) => p.name.trim() && !known.has(p.name.trim())).slice(0, 10);
  await prisma.$transaction([
    ...newFacts.map((f) => prisma.profileFact.create({ data: { area: f.area, text: cleanFact(f.text), evidence: cleanFact(f.evidence) || null, source: "CLAUDE", confidence: 0.6 } })),
    ...newPeople.map((p) => prisma.person.create({ data: { name: p.name.trim().slice(0, 60), relation: p.relation?.slice(0, 40) ?? null, note: p.note?.slice(0, 200) ?? null, source: "CLAUDE" } })),
    prisma.settings.update({ where: { id: 1 }, data: { profileLearnedAt: new Date() } }),
  ]);
  return ok({ facts: newFacts.length, people: newPeople.length });
}

// ── تصحيحات عمر: هي الي بتخلّي التطبيق «نسخة منه» ──
export async function confirmFact(id: string) {
  await prisma.profileFact.updateMany({ where: { id }, data: { status: "CONFIRMED" } });
}
export async function rejectFact(id: string) {
  // المكتوب بإيده بينمسح؛ المستنتج بيضل مرفوض عشان ما يرجع
  const f = await prisma.profileFact.findUnique({ where: { id } });
  if (!f) return;
  if (f.source === "ME") await prisma.profileFact.delete({ where: { id } });
  else await prisma.profileFact.update({ where: { id }, data: { status: "REJECTED" } });
}
export async function restoreFact(id: string) {
  await prisma.profileFact.updateMany({ where: { id }, data: { status: "NEW" } });
}
export async function correctFact(id: string, text: string): Promise<Result<void>> {
  const t = cleanFact(text);
  if (!t) return err("EMPTY", "اكتب الصح");
  await prisma.profileFact.updateMany({ where: { id }, data: { text: t, source: "ME", status: "CONFIRMED", confidence: 1 } });
  return ok(undefined);
}
export async function addFact(area: ProfileArea, text: string): Promise<Result<void>> {
  if (!PROFILE_AREAS.includes(area)) return err("AREA", "مجال مش معروف");
  const t = cleanFact(text);
  if (!t) return err("EMPTY", "اكتب شي");
  await prisma.profileFact.create({ data: { area, text: t, source: "ME", status: "CONFIRMED", confidence: 1 } });
  return ok(undefined);
}

// ── دفتر العلاقات ──
export type PersonInput = { name: string; relation?: string | null; note?: string | null; lastContact?: Ymd | null };
export async function savePerson(id: string | null, p: PersonInput): Promise<Result<void>> {
  const name = p.name.trim().slice(0, 60);
  if (!name) return err("EMPTY", "اكتب الاسم");
  const data = {
    name,
    relation: p.relation?.trim().slice(0, 40) || null,
    note: p.note?.trim().slice(0, 300) || null,
    lastContact: p.lastContact && isValidYmd(p.lastContact) ? toDate(p.lastContact) : null,
  };
  if (id) await prisma.person.updateMany({ where: { id }, data: { ...data, source: "ME" } });
  else await prisma.person.create({ data });
  return ok(undefined);
}
export async function touchPerson(id: string, today: Ymd) {
  if (isValidYmd(today)) await prisma.person.updateMany({ where: { id }, data: { lastContact: toDate(today) } });
}
export async function removePerson(id: string) {
  await prisma.person.deleteMany({ where: { id } });
}
