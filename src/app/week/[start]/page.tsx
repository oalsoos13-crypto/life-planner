import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskForm } from "@/components/AddTaskForm";
import { StatsRow } from "@/components/StatsRow";
import { getDict } from "@/lib/i18n";
import { addDays, formatWeekRange, isValidYmd, weekStartOf } from "@/lib/dates";
import { ensureRecurrences, getContext, getWeekTasks, isEditableWeek, toView, weekStats } from "@/lib/week";
import { goalOptions } from "@/lib/goals";

export default async function WeekPage({ params, searchParams }: { params: Promise<{ start: string }>; searchParams: Promise<{ add?: string }> }) {
  const { start } = await params;
  const { add } = await searchParams;
  const { settings, today, currentWeek } = await getContext();
  if (!isValidYmd(start)) redirect(`/week/${currentWeek}`);
  const ws = weekStartOf(start, settings.weekStartDay);
  if (ws !== start) redirect(`/week/${ws}`);

  await ensureRecurrences(currentWeek);
  const t = getDict(settings.locale);
  const [tasks, goals] = await Promise.all([getWeekTasks(ws), goalOptions(ws)]);
  const editable = isEditableWeek(ws, currentWeek);
  const stats = weekStats(tasks, today);
  const label =
    ws === currentWeek ? t.thisWeek : ws === addDays(currentWeek, -7) ? t.lastWeek : ws === addDays(currentWeek, 7) ? t.nextWeek : null;

  // الملغاة آخر شي
  const views = tasks.map((x) => toView(x, today)).sort((a, b) => Number(a.cancelled) - Number(b.cancelled));

  return (
    <Shell title={t.week}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/week/${addDays(ws, -7)}`} className="btn" aria-label="prev">{settings.locale === "ar" ? "›" : "‹"}</Link>
        <div className="text-center">
          <div className="font-bold">{label ?? formatWeekRange(ws, settings.locale)}</div>
          <div className="text-xs text-muted">
            {label && formatWeekRange(ws, settings.locale)}
            {!editable && <span className="ms-1 rounded-full bg-line px-2 py-0.5">{t.readOnly}</span>}
          </div>
        </div>
        <Link href={`/week/${addDays(ws, 7)}`} className="btn" aria-label="next">{settings.locale === "ar" ? "‹" : "›"}</Link>
      </div>
      {ws !== currentWeek && (
        <Link href={`/week/${currentWeek}`} className="mb-4 block text-center text-sm text-accent">{t.thisWeek}</Link>
      )}

      <div className="space-y-3">
        <StatsRow t={t} s={stats} />
        {editable && <AddTaskForm weekStart={ws} goals={goals} autoFocus={add === "1"} />}
        {views.length === 0 && <p className="py-8 text-center text-muted">{t.noTasks}</p>}
        {views.map((v) => (
          <TaskCard key={v.id} task={v} goals={goals} editable={editable} />
        ))}
        <Link href={`/review/${ws}`} className="block py-3 text-center text-sm text-accent">{t.review}</Link>
      </div>
    </Shell>
  );
}
