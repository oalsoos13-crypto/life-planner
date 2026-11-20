import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Galaxy } from "@/components/space/Planet";
import { Icon } from "@/components/ui/Icon";
import { CompassField, CompassItems, EnoughCard } from "@/components/compass/Compass";
import { Swot, Wheel } from "@/components/compass/Wheel";
import { getCompass, getDecisions } from "@/modules/direction/server";
import { getSwot, getWheel } from "@/modules/diagnosis/server";
import { reviewDue } from "@/modules/direction";
import { getContext } from "@/lib/week";

export const dynamic = "force-dynamic";

// البوصلة (مخطط المنتج: تبويب البوصلة): التوجيه والتشخيص والقرارات. الاستراتيجية بتنبني فوقها.
export default async function CompassPage() {
  const { today } = await getContext();
  const [c, wheel, swot, decisions] = await Promise.all([getCompass(), getWheel(), getSwot(), getDecisions()]);
  const due = decisions.filter((d) => reviewDue(d.reviewAt, d.status, today)).length;
  const open = decisions.filter((d) => d.status === "OPEN").length;
  const pct = c.status.done / c.status.total;
  return (
    <Shell
      title="البوصلة"
      subtitle="مين إنت، ولوين رايح، وكيف بتقرّر."
      art={<div className="mt-6 -ml-16"><Galaxy id="cmp-gx" w={280} h={200} /></div>}
      action={<Link href="/settings" aria-label="الإعدادات" className="btn btn-sm h-11 w-11 p-0"><Icon name="Settings2" size={20} /></Link>}
    >
      <div className="space-y-6">
        <section className="hero-card">
          <h2 className="eyebrow relative z-[1]">بوصلتك · <bdi className="tnum">{c.status.done}</bdi> من <bdi className="tnum">{c.status.total}</bdi></h2>
          <div className="relative z-[1] mt-3 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full gold-fill" style={{ width: `${Math.round(pct * 100)}%` }} /></div>
          <p className="relative z-[1] mt-3 font-display text-[21px] font-bold leading-snug">{c.status.next ? `الجاي: ${c.status.next}` : "البوصلة كاملة ✦ راجعها مرة بالسنة"}</p>
          <p className="meta relative z-[1] mt-1 text-[13px]">بالترتيب: التأبين، القيم، الرؤية، الرسالة، المبادئ، الهوية <bdi dir="ltr">(Covey · DYL · Collins · Dalio)</bdi></p>
        </section>

        <Link href="/decisions" className="card flex items-center gap-3 p-4 active:bg-surface-2">
          <span className="orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><Icon name="Compass" size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[20px] font-bold">سجل القرارات</span>
            <span className="block text-[14px] text-muted">{due ? `${due} قرار صار وقت مراجعته` : open ? `${open} قرار مفتوح` : "قاعدة 90%، Premortem، وفحص تحيّزات لكل قرار كبير"}</span>
          </span>
          <span className="text-muted" aria-hidden>‹</span>
        </Link>

        <section className="space-y-3">
          <h2 className="font-display text-[23px] font-bold">التوجيه</h2>
          <CompassField field="eulogy" title="يوم التأبين" source="Covey" prompt="تخيّل آخر يوم. شو بدك أهلك وصحابك وزملاءك يحكوا عنك؟" value={c.fields.eulogy} />
          <CompassItems kind="VALUE" items={c.values} />
          <CompassField field="bhag" title="الهدف الكبير الجريء" source="Collins · BHAG" prompt="شي كبير ومخيف شوي، لـ 10 سنين" value={c.fields.bhag} big />
          <CompassField field="picture3y" title="حياتي بعد 3 سنين" source="رؤية حيّة" prompt="صف يوم عادي من حياتك بعد 3 سنين: وين ساكن، شو بتشتغل، مع مين، قديش بتكسب" value={c.fields.picture3y} />
          <CompassField field="mission" title="رسالتي" source="Covey" prompt="ليش أنا موجود، بجملة وحدة" value={c.fields.mission} />
          <CompassField field="winning" title="الفوز إلي يعني…" source="Playing to Win" prompt="بعد 3 سنين، شو لازم يكون صار لتقول «ربحت»؟" value={c.fields.winning} />
          <CompassItems kind="PRINCIPLE" items={c.principles} />
          <CompassItems kind="IDENTITY" items={c.identity} />
          <CompassField field="why" title="بطاقة «ليش»" source="Frankl" prompt="لما تتعب وبدك توقف، شو الجملة الي بترجعك؟" value={c.fields.why} big />
          <EnoughCard value={c.fields.enough} note={c.enoughNote} />
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-[23px] font-bold">التشخيص</h2>
          <Wheel entries={wheel.entries} avg={wheel.stats.avg} lowest={wheel.stats.lowest} ratedOn={wheel.ratedOn} />
          <Swot items={swot} />
        </section>
      </div>
    </Shell>
  );
}
