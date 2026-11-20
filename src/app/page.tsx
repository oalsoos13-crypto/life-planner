import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Moon, Planet } from "@/components/space/Planet";
import { NextStep } from "@/components/home/NextStep";
import { Dot } from "@/components/ui/Dot";
import { DayLine } from "@/components/today/DayLine";
import { KpiStrip } from "@/components/today/KpiStrip";
import { EnergyPicker, EveningCard, Habits, IntentCard } from "@/components/today/Today";
import { prisma } from "@/lib/db";
import { addDays, dayOfWeek, formatDay, toDate, toYmd } from "@/lib/dates";
import { ensureRecurrences, getContext, getWeekTasks, weekStats } from "@/lib/week";
import { pickNextStep } from "@/modules/execution";
import { getStrategyView } from "@/modules/strategy/server";
import { relativeDay, daysBetween } from "@/shared/kernel/relative";
import { blocksForDay, fmtMinute, greeting as greet, hijriDay, hijriLabel, nextRamadan, nowInDay, parseBlocks } from "@/modules/daily";
import { getKpiStrip, getToday } from "@/modules/daily/server";

// «اليوم» (مخطط المنتج، محرك التنفيذ اليومي؛ دليل الواجهات §10.1):
// النية ← الخطوة الجاية بوقتها ← يومك ← الطاقة والعادات ← أرقام الربع ← مراجعة المسا.
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
  const [tasks, nextWeekTasks, strategy, subs, day, pillars] = await Promise.all([
    getWeekTasks(currentWeek),
    getWeekTasks(addDays(currentWeek, 7)),
    getStrategyView(today),
    prisma.planSubtask.findMany({
      where: { dueDate: { gte: todayD }, status: { not: "DONE" } },
      include: { planTask: { include: { goal: { include: { pillar: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    getToday(today),
    prisma.pillar.findMany({ where: { archived: false }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);
  const kpis = strategy ? await getKpiStrip(strategy.cycle.id) : [];
  const stats = weekStats(tasks, today);
  const rankOf = new Map(strategy?.okrs.map((o) => [o.id, o.rank]) ?? []);
  const candidates = (list: typeof tasks) =>
    list.map((t) => ({ ...t, cancelled: !!t.cancelledAt, okrRank: (t.goalId && rankOf.get(t.goalId)) || null, hasGoal: !!t.goalId }));
  // إذا هالأسبوع فاضي (مثلاً قبل ما يبلّش الربع)، منجيب الخطوة من الأسبوع الجاي
  const nowNext = pickNextStep(candidates(tasks));
  const next = nowNext ?? pickNextStep(candidates(nextWeekTasks));
  const fromNextWeek = !nowNext && !!next;

  // الوقت بتوقيتك: التحية، وين إنت باليوم، وأقرب وقت فاضي
  const [hh, mi] = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: settings.timezone }).format(new Date()).split(":").map(Number);
  const minute = hh * 60 + mi;
  const blocks = blocksForDay(parseBlocks(settings.dayBlocks), dayOfWeek(today));
  const { current, nextFree } = nowInDay(blocks, minute);
  const when = current ? (nextFree ? `بعد ${current.label}، ${fmtMinute(nextFree.start)}` : null) : "هلّق، وقتك إلك";
  const ramadan = nextRamadan(today);
  const toRamadan = ramadan ? daysBetween(today, ramadan) : null;
  const cycleLine = strategy ? (strategy.cycle.started ? `الأسبوع ${strategy.cycle.weekNo} من 13` : `الربع بيبلّش ${relativeDay(strategy.cycle.start, today)}`) : null;
  const reviewDay = [5, 6].includes(dayOfWeek(today));
  const evening = hh >= 20 || hh < 4;

  return (
    <Shell
      art={<div className="-mt-12 -ml-24"><Planet id="home-p" r={105} ring /></div>}
      eyebrow={
        <span className="flex items-center gap-2.5">
          <Moon id="home-moon" r={13} day={hijriDay(today)} />
          <span className="leading-snug">{formatDay(today, "ar", { weekday: "long", day: "numeric", month: "long" })}<br /><b className="font-semibold text-ink">{hijriLabel(today)}</b></span>
        </span>
      }
      title={<>{greet(hh)} <span className="gold-text">يا عمر</span></>}
      subtitle={
        <>
          {toRamadan != null && toRamadan > 0 && <>باقي <b className="gold-text tnum">{toRamadan}</b> ليلة لهلال رمضان</>}
          {toRamadan === 0 && "رمضان كريم"}
          {cycleLine && <> · {cycleLine}</>}
        </>
      }
    >
      <div className="space-y-6">
        <IntentCard intent={day.intent} />
        <NextStep
          when={when}
          weekHref={`/week/${currentWeek}`}
          task={
            next && {
              id: next.id,
              title: next.title,
              goal: next.goal?.title ?? null,
              pillar: next.goal?.pillar.name ?? null,
              color: next.goal?.pillar.color ?? null,
              okrRank: next.okrRank,
              steps: { done: next.steps.filter((x) => x.done).length, total: next.steps.length },
            }
          }
          label={fromNextWeek ? "الخطوة الجاية · من الأسبوع الجاي" : undefined}
        />

        <DayLine blocks={blocks} minute={minute} />

        <section aria-labelledby="en-h">
          <h2 id="en-h" className="eyebrow mb-2">طاقتك هلّق</h2>
          <EnergyPicker energy={day.energy} />
        </section>

        <Habits habits={day.habits} pillars={pillars} />

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

        {strategy?.kernel?.essentialIntent && (
          <p className="border-s-2 border-gold-deco ps-3 font-display text-[18px] leading-relaxed text-gold">{strategy.kernel.essentialIntent}</p>
        )}
        <KpiStrip items={kpis} />

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

        {evening && <EveningCard evening={day.evening} />}
      </div>
    </Shell>
  );
}
