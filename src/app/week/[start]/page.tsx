import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { WeekList } from "@/components/week/WeekList";
import { getDict } from "@/lib/i18n";
import { addDays, formatWeekRange, isValidYmd, weekStartOf } from "@/lib/dates";
import { ensureRecurrences, getContext, getWeekTasks, isEditableWeek, toView, weekStats } from "@/lib/week";
import { goalOptions } from "@/lib/goals";

// الأسبوع (دليل الواجهات §10.2): عنوان واحد، تقدّم بسطر، مجموعات، وزر عائم.
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
  const label = ws === currentWeek ? t.thisWeek : ws === addDays(currentWeek, -7) ? t.lastWeek : ws === addDays(currentWeek, 7) ? t.nextWeek : null;
  const range = formatWeekRange(ws, settings.locale);

  return (
    <Shell
      title={label ?? range}
      subtitle={label ? range : undefined}
      action={
        // بالعربي: الماضي يمين والمستقبل شمال (DOET: التطابق)
        <div className="flex shrink-0 gap-1">
          <Link href={`/week/${addDays(ws, -7)}`} className="btn btn-sm h-11 w-11 p-0 text-xl" aria-label="الأسبوع الي قبله">›</Link>
          <Link href={`/week/${addDays(ws, 7)}`} className="btn btn-sm h-11 w-11 p-0 text-xl" aria-label="الأسبوع الي بعده">‹</Link>
        </div>
      }
    >
      <div className="space-y-4">
        {(ws !== currentWeek || !editable) && (
          <div className="flex items-center justify-between gap-2 text-[15px]">
            {!editable && <span className="badge">للقراءة بس</span>}
            {ws !== currentWeek && <Link href={`/week/${currentWeek}`} className="btn btn-text btn-sm ms-auto">ارجع لهالأسبوع</Link>}
          </div>
        )}
        {stats.total > 0 && (
          <div>
            <div className="flex items-baseline justify-between text-[15px]">
              <span className="tnum">
                <bdi className="text-[20px] font-extrabold">{stats.done}</bdi> <span className="text-muted">من</span> <bdi className="font-bold">{stats.total}</bdi> <span className="text-muted">خلصوا</span>
              </span>
              <Link href={`/review/${ws}`} className="btn btn-text btn-sm -me-2">مراجعة الأسبوع ‹</Link>
            </div>
            <div className="bar mt-1"><span style={{ width: `${stats.pct ?? 0}%` }} /></div>
          </div>
        )}
        <WeekList tasks={tasks.map((x) => toView(x, today))} goals={goals} editable={editable} weekStart={ws} autoAdd={add === "1"} />
      </div>
    </Shell>
  );
}
