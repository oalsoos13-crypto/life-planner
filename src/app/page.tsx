import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { StatsRow } from "@/components/StatsRow";
import { getDict } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { addDays, dayOfWeek, formatDay, toDate, toYmd } from "@/lib/dates";
import { ensureRecurrences, getContext, getWeekTasks, weekStats } from "@/lib/week";

export default async function Home() {
  const { settings, today, currentWeek } = await getContext();
  const t = getDict(settings.locale);
  const prevWeek = addDays(currentWeek, -7);

  // يوم بداية الأسبوع: أول فتحة بتوديك على مراجعة الأسبوع الماضي
  if (dayOfWeek(today) === settings.weekStartDay) {
    const r = await prisma.weekReview.findUnique({ where: { weekStart: toDate(prevWeek) } });
    if (!r?.seenAt) {
      await prisma.weekReview.upsert({
        where: { weekStart: toDate(prevWeek) },
        update: { seenAt: new Date() },
        create: { weekStart: toDate(prevWeek), seenAt: new Date() },
      });
      redirect(`/review/${prevWeek}`);
    }
  }

  await ensureRecurrences(currentWeek);
  const todayD = toDate(today);
  const [tasks, prevTasks, cycle, subs, steps] = await Promise.all([
    getWeekTasks(currentWeek),
    getWeekTasks(prevWeek),
    prisma.cycle.findFirst({
      where: { OR: [{ startDate: { lte: todayD }, endDate: { gte: todayD } }, { startDate: { gt: todayD } }] },
      orderBy: { startDate: "asc" },
      include: { goals: { where: { archived: false }, include: { pillar: true } } },
    }),
    prisma.planSubtask.findMany({
      where: { dueDate: { gte: todayD }, status: { not: "DONE" }, steps: { none: {} } },
      include: { planTask: { include: { goal: { include: { pillar: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.planStep.findMany({
      where: { dueDate: { gte: todayD }, status: { not: "DONE" } },
      include: { subtask: { include: { planTask: { include: { goal: { include: { pillar: true } } } } } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);
  const stats = weekStats(tasks, today);
  // المتأخر من الأسبوع الماضي كمان
  stats.overdue += weekStats(prevTasks, today).overdue;

  const upcoming = [
    ...subs.map((s) => ({ id: s.id, title: s.title, due: toYmd(s.dueDate!), goal: s.planTask.goal.title, color: s.planTask.goal.pillar.color })),
    ...steps.map((s) => ({ id: s.id, title: `${s.subtask.title}: ${s.title}`, due: toYmd(s.dueDate!), goal: s.subtask.planTask.goal.title, color: s.subtask.planTask.goal.pillar.color })),
  ]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  const pillars = new Map<string, { name: string; color: string; count: number; order: number }>();
  for (const g of cycle?.goals ?? []) {
    const p = pillars.get(g.pillarId) ?? { name: g.pillar.name, color: g.pillar.color, count: 0, order: g.pillar.order };
    p.count++;
    pillars.set(g.pillarId, p);
  }

  return (
    <Shell
      title={t.appName}
      action={<Link href={`/week/${currentWeek}?add=1`} className="btn btn-primary">+ {t.addTaskThisWeek}</Link>}
    >
      <div className="space-y-4">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-bold">{t.thisWeek}</h2>
            <Link href={`/week/${currentWeek}`} className="text-sm text-accent">{t.week}</Link>
          </div>
          <StatsRow t={t} s={stats} />
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-bold">{t.upcoming}</h2>
          <ul className="space-y-3">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: u.color }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug">{u.title}</div>
                  <div className="text-xs text-muted">{u.goal}</div>
                </div>
                <span className={`shrink-0 text-sm ${u.due === today ? "font-bold text-red-600" : "text-muted"}`}>
                  {u.due === today ? t.dueToday : formatDay(u.due, settings.locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-bold">{t.pillars}</h2>
            {cycle && <span className="text-xs text-muted">{cycle.name}</span>}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {[...pillars.values()].sort((a, b) => a.order - b.order).map((p) => (
              <li key={p.name} className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <span className="flex-1 truncate font-semibold">{p.name}</span>
                <span className="text-xs text-muted">{p.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{t.scoresSoon}</p>
        </section>

        <Link href={`/review/${prevWeek}`} className="block py-2 text-center text-sm text-accent">{t.openReview}</Link>
      </div>
    </Shell>
  );
}
