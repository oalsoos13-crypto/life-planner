import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { NextStep } from "@/components/home/NextStep";
import { Ring } from "@/components/ui/Ring";
import { Dot } from "@/components/ui/Dot";
import { prisma } from "@/lib/db";
import { addDays, dayOfWeek, toDate, toYmd } from "@/lib/dates";
import { ensureRecurrences, getContext, getWeekTasks, weekStats } from "@/lib/week";
import { pickNextStep } from "@/modules/execution";
import { getStrategyView } from "@/modules/strategy/server";
import { relativeDay } from "@/shared/kernel/relative";

// الرئيسية (دليل الواجهات §10.1): بتجاوب «شو أعمل هلأ؟» أول شي، وبعدين الأولويات والأسبوع بسطر.
export default async function Home() {
  const { settings, today, currentWeek } = await getContext();
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
  const [tasks, nextWeekTasks, strategy, subs] = await Promise.all([
    getWeekTasks(currentWeek),
    getWeekTasks(addDays(currentWeek, 7)),
    getStrategyView(today),
    prisma.planSubtask.findMany({
      where: { dueDate: { gte: todayD }, status: { not: "DONE" } },
      include: { planTask: { include: { goal: { include: { pillar: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
  ]);
  const stats = weekStats(tasks, today);
  const rankOf = new Map(strategy?.okrs.map((o) => [o.id, o.rank]) ?? []);
  const candidates = (list: typeof tasks) =>
    list.map((t) => ({ ...t, cancelled: !!t.cancelledAt, okrRank: (t.goalId && rankOf.get(t.goalId)) || null, hasGoal: !!t.goalId }));
  // إذا هالأسبوع فاضي (مثلاً قبل ما يبلّش الربع)، منجيب الخطوة من الأسبوع الجاي
  const nowNext = pickNextStep(candidates(tasks));
  const next = nowNext ?? pickNextStep(candidates(nextWeekTasks));
  const fromNextWeek = !nowNext && !!next;

  // التحية حسب ساعة الكويت
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: settings.timezone }).format(new Date()));
  const greeting = hour < 12 ? "صباح الخير يا عمر" : "مسا الخير يا عمر";
  const sub = strategy ? (strategy.cycle.started ? `الأسبوع ${strategy.cycle.weekNo} من 13` : `الربع بيبلّش ${relativeDay(strategy.cycle.start, today)}`) : undefined;
  const reviewDay = [5, 6].includes(dayOfWeek(today));

  return (
    <Shell title={greeting} subtitle={sub}>
      <div className="space-y-6">
        <NextStep
          weekHref={`/week/${currentWeek}`}
          task={
            next && {
              id: next.id,
              title: next.title,
              goal: next.goal?.title ?? null,
              pillar: next.goal?.pillar.name ?? null,
              color: next.goal?.pillar.color ?? null,
              okrRank: next.okrRank,
            }
          }
          label={fromNextWeek ? "الخطوة الجاية · من الأسبوع الجاي" : undefined}
        />

        {/* الأسبوع بسطر واحد، مش بطاقة أرقام (§9.1) */}
        <Link href={`/week/${currentWeek}`} className="card block p-4 active:bg-surface-2">
          <div className="flex items-baseline justify-between">
            <span className="font-bold">هالأسبوع</span>
            <span className="tnum text-[15px] text-muted">
              {stats.total === 0 ? "ما في مهام لسا" : stats.done === 0 ? `${stats.total} مهمة · ابدأ بأول وحدة` : <><bdi className="font-bold text-ink">{stats.done}</bdi> من <bdi>{stats.total}</bdi> خلصوا</>}
            </span>
          </div>
          {stats.total > 0 && <div className="bar mt-2"><span style={{ width: `${stats.pct ?? 0}%` }} /></div>}
          {(stats.stuck > 0 || stats.overdue > 0) && (
            <p className="mt-2 text-[15px] text-warning">
              {stats.stuck > 0 && `⚠ ${stats.stuck} عالقة`} {stats.overdue > 0 && `⏰ ${stats.overdue} متأخرة`}
            </p>
          )}
        </Link>

        {reviewDay && (
          <Link href={`/review/${currentWeek}`} className="card flex items-center gap-3 p-4 active:bg-surface-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft text-gold" aria-hidden>◆</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">مراجعة الأسبوع جاهزة</span>
              <span className="block text-[15px] text-muted">10 دقائق، وبتطلع بخطة أخف</span>
            </span>
            <span className="text-muted" aria-hidden>‹</span>
          </Link>
        )}

        {strategy && strategy.okrs.length > 0 && (
          <section aria-labelledby="okrs-h">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="okrs-h" className="text-[20px] font-bold">أولويات الربع</h2>
              <Link href="/strategy" className="btn btn-text btn-sm -me-2">الاستراتيجية ‹</Link>
            </div>
            {strategy.kernel?.essentialIntent && (
              <p className="mb-3 border-s-2 border-gold-deco ps-3 text-[15px] font-bold leading-relaxed text-gold">{strategy.kernel.essentialIntent}</p>
            )}
            <ul className="card divide-y divide-line">
              {strategy.okrs.map((o) => (
                <li key={o.id}>
                  <Link href="/strategy" className="flex items-center gap-3 p-4 active:bg-surface-2">
                    <Ring value={o.score} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold leading-snug">{o.title}</div>
                      <div className="flex items-center gap-1.5 text-[15px] text-muted">
                        <Dot color={o.pillar.color} /> {o.pillar.name} · {o.krs.length} نتائج
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {subs.length > 0 && (
          <section aria-labelledby="up-h">
            <h2 id="up-h" className="mb-2 text-[20px] font-bold">جاي من الخطة</h2>
            <ul className="card divide-y divide-line">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <Dot color={s.planTask.goal.pillar.color} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold leading-snug">{s.title}</div>
                    <div className="text-[15px] text-muted">{s.planTask.goal.title}</div>
                  </div>
                  <span className={`shrink-0 text-[15px] ${toYmd(s.dueDate!) === today ? "font-bold text-warning" : "text-muted"}`}>{relativeDay(toYmd(s.dueDate!), today)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* زر عائم قريب من الإبهام (Fitts) */}
      <Link
        href={`/week/${currentWeek}?add=1`}
        aria-label="أضف مهمة لهالأسبوع"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] end-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-on-accent shadow-[var(--shadow-md)] transition active:scale-95"
      >
        +
      </Link>
    </Shell>
  );
}
