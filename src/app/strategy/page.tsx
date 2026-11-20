import { Shell } from "@/components/Shell";
import { KernelCard } from "@/components/strategy/KernelCard";
import { AuditCard } from "@/components/strategy/AuditCard";
import { OkrCard } from "@/components/strategy/OkrCard";
import { StrategicGoals } from "@/components/strategy/StrategicGoals";
import { NotDoing } from "@/components/strategy/NotDoing";
import { Maintenance } from "@/components/strategy/Maintenance";
import { TimeBudget } from "@/components/strategy/TimeBudget";
import { ConfirmDraft } from "@/components/strategy/ConfirmDraft";
import { MAX_ACTIVE_OKRS } from "@/modules/strategy";
import { getStrategyView } from "@/modules/strategy/server";
import { getContext } from "@/lib/week";
import { formatDay } from "@/lib/dates";

// شاشة الاستراتيجية (منهجية §5.3 ج): النواة فوق، بعدين الفحص، الأولويات، الخريطة، قائمة «لا»، والصيانة.
export default async function StrategyPage() {
  const { today, settings } = await getContext();
  const v = await getStrategyView(today);
  if (!v) return <Shell title="الاستراتيجية"><p className="py-10 text-center text-muted">ما في دورة لسا.</p></Shell>;

  const sub = v.cycle.started ? `الأسبوع ${v.cycle.weekNo} من 13` : `بتبلّش ${formatDay(v.cycle.start, settings.locale, { day: "numeric", month: "long" })}`;

  return (
    <Shell title="الاستراتيجية" subtitle={`${v.cycle.name} · ${sub}`}>
      <div className="space-y-6">
        {v.kernel?.isDraft && <ConfirmDraft cycleId={v.cycle.id} />}
        <KernelCard cycleId={v.cycle.id} kernel={v.kernel} />
        <AuditCard warnings={v.warnings} />

        <section className="space-y-3" aria-labelledby="okr-h">
          <div className="flex items-baseline justify-between">
            <h2 id="okr-h" className="text-[20px] font-bold">أولويات الربع</h2>
            <span className="tnum text-[15px] text-muted"><bdi>{v.okrs.length}</bdi> من <bdi>{MAX_ACTIVE_OKRS}</bdi></span>
          </div>
          {v.okrs.length === 0 && (
            <div className="card p-6 text-center">
              <p className="font-bold">ما في أولويات نشطة لسا</p>
              <p className="text-[15px] text-muted">افتح «أهداف الصيانة» تحت ورقّي 1-3 أهداف.</p>
            </div>
          )}
          {v.okrs.map((o) => <OkrCard key={o.id} okr={o} sgs={v.strategicGoals} />)}
          <TimeBudget cycleId={v.cycle.id} free={v.kernel?.freeHours ?? null} planned={v.plannedHours} />
        </section>

        <section className="space-y-3" aria-labelledby="sg-h">
          <div>
            <h2 id="sg-h" className="text-[20px] font-bold">خريطة الاستراتيجية: 3 سنين</h2>
            <p className="text-[15px] text-muted">4-6 أهداف على 4 منظورات. كل أولوية لازم تخدم وحدة منها.</p>
          </div>
          <StrategicGoals sgs={v.strategicGoals} okrs={v.okrs} />
        </section>

        <section className="space-y-3" aria-labelledby="no-h">
          <div>
            <h2 id="no-h" className="text-[20px] font-bold">قائمة «لا»</h2>
            <p className="text-[15px] text-muted">الي رح تتركه أو تقصّر فيه عن قصد هالربع.</p>
          </div>
          <NotDoing cycleId={v.cycle.id} items={v.notDoing} />
        </section>

        <Maintenance goals={v.maintenance} okrs={v.okrs} />
      </div>
    </Shell>
  );
}
