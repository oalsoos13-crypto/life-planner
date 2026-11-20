import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/ui/Icon";
import { Planet } from "@/components/space/Planet";
import { AdvisorChat } from "@/components/advisor/AdvisorChat";
import { advisorConnected, getAdvisorThread } from "@/modules/advisor/server";

export const dynamic = "force-dynamic";

// المستشار (مخطط المنتج): عقل بيعرف استراتيجيتك وأرقامك ويومك، وبيحكي معك بلهجتك
export default async function AdvisorPage() {
  const thread = await getAdvisorThread();
  return (
    <Shell
      title="مستشارك"
      subtitle="بيعرف استراتيجيتك وأرقامك ويومك. اسأله أي شي."
      art={<div className="-mt-6 -ml-10"><Planet id="adv-p" r={56} light="#ffffff" base="#7b66ff" band="#fff" ring /></div>}
      action={<Link href="/me" aria-label="شو بيعرف عني" className="btn btn-sm h-11 w-11 p-0"><Icon name="Brain" size={20} /></Link>}
    >
      <AdvisorChat initial={thread} connected={advisorConnected()} modelUrl={process.env.AVATAR_MODEL_URL ? "/api/avatar" : undefined} />
    </Shell>
  );
}
