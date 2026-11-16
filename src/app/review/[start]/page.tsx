import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ReviewForm } from "@/components/ReviewForm";
import { getDict } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { addDays, formatWeekRange, isValidYmd, toDate, weekStartOf } from "@/lib/dates";
import { getContext, getWeekTasks, isOverdue, weekStats } from "@/lib/week";

export default async function ReviewPage({ params }: { params: Promise<{ start: string }> }) {
  const { start } = await params;
  const { settings, today, currentWeek } = await getContext();
  if (!isValidYmd(start)) redirect(`/review/${addDays(currentWeek, -7)}`);
  const ws = weekStartOf(start, settings.weekStartDay);
  if (ws !== start) redirect(`/review/${ws}`);
  const t = getDict(settings.locale);

  const [tasks, prevTasks, review, carriedNext] = await Promise.all([
    getWeekTasks(ws),
    getWeekTasks(addDays(ws, -7)),
    prisma.weekReview.findUnique({ where: { weekStart: toDate(ws) } }),
    prisma.weeklyTask.findMany({ where: { weekStart: toDate(addDays(ws, 7)), carriedFrom: { weekStart: toDate(ws) } } }),
  ]);
  const s = weekStats(tasks, today);
  const p = weekStats(prevTasks, today);
  const diff = s.pct != null && p.pct != null ? s.pct - p.pct : null;

  const groups = [
    { title: t.completed, items: tasks.filter((x) => x.status === "DONE" && !x.cancelledAt).map((x) => x.title), cls: "text-emerald-600 dark:text-emerald-400", icon: "✓" },
    { title: t.late, items: tasks.filter((x) => isOverdue(x, today) || (x.status !== "DONE" && !x.cancelledAt && ws >= currentWeek)).map((x) => x.title), cls: "text-red-600 dark:text-red-400", icon: "!" },
    { title: t.carriedOver, items: carriedNext.map((x) => x.title), cls: "text-sky-600 dark:text-sky-400", icon: "→" },
    { title: t.cancelledList, items: tasks.filter((x) => x.cancelledAt).map((x) => `${x.title}${x.cancelReason ? ` (${x.cancelReason})` : ""}`), cls: "text-muted", icon: "⊘" },
  ];

  return (
    <Shell title={t.review}>
      <p className="-mt-2 mb-4 text-sm text-muted">{formatWeekRange(ws, settings.locale)}</p>
      <div className="space-y-3">
        <div className="card flex items-center justify-between p-4">
          <div>
            <div className="text-sm text-muted">{t.completion}</div>
            <div className="text-4xl font-extrabold">{s.pct ?? 0}%</div>
          </div>
          {diff != null && (
            <div className="text-end">
              <div className={`text-xl font-bold ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`} dir="ltr">
                {diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}%
              </div>
              <div className="text-xs text-muted">{t.vsPrev} ({p.pct}%)</div>
            </div>
          )}
        </div>

        {groups.map((g) => (
          <div key={g.title} className="card p-4">
            <h2 className={`mb-2 font-bold ${g.cls}`}>{g.icon} {g.title} ({g.items.length})</h2>
            {g.items.length === 0 ? (
              <p className="text-sm text-muted">{t.nothing}</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm">
                {g.items.map((i, k) => <li key={k}>{i}</li>)}
              </ul>
            )}
          </div>
        ))}

        <ReviewForm weekStart={ws} learned={review?.learned ?? ""} top3={Array.isArray(review?.top3) ? (review!.top3 as string[]) : []} />

        <div className="flex justify-between text-sm">
          <Link href={`/review/${addDays(ws, -7)}`} className="text-accent">{t.lastWeek}</Link>
          <Link href={`/week/${ws}`} className="text-accent">{t.week}</Link>
        </div>
      </div>
    </Shell>
  );
}
