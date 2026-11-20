import { Shell } from "@/components/Shell";
import { Planet } from "@/components/space/Planet";
import { DecisionsList } from "@/components/compass/Decisions";
import { getDecisions } from "@/modules/direction/server";
import { advisorConnected } from "@/modules/advisor/server";
import { getContext } from "@/lib/week";

export const dynamic = "force-dynamic";

// سجل القرارات (منهجية §5: سجل قرارات مع فحص تحيّزات)
export default async function DecisionsPage() {
  const [{ today }, items] = await Promise.all([getContext(), getDecisions()]);
  return (
    <Shell title="سجل القرارات" subtitle="قرار مكتوب، مفحوص، وبيتراجع." art={<div className="-mt-6 -ml-10"><Planet id="dec-p" r={50} light="#ffe2c4" base="#c46bff" band="#ffd1f0" ring /></div>}>
      <DecisionsList items={items} today={today} connected={advisorConnected()} />
    </Shell>
  );
}
