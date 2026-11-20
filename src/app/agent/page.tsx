import { Shell } from "@/components/Shell";
import { Planet } from "@/components/space/Planet";
import { JobCard, NewJob } from "@/components/agent/Agent";
import { getAgent } from "@/modules/agent/server";

export const dynamic = "force-dynamic";

// الوكيل على اللابتوب (مخطط المنتج: المنفّذ). التطبيق طابور وموافقات بس؛ الشغل نفسه بيصير على لابتوبك
// بـ Claude Code، وملفات الشركة ما بتطلع منه.
export default async function AgentPage() {
  const a = await getAgent();
  const approvals = a.jobs.filter((j) => j.status === "NEEDS_APPROVAL");
  const active = a.jobs.filter((j) => ["QUEUED", "RUNNING", "APPROVED", "SENDING"].includes(j.status));
  const scheduled = a.jobs.filter((j) => j.repeatDay != null && !active.includes(j) && !approvals.includes(j));
  const history = a.jobs.filter((j) => j.repeatDay == null && ["DONE", "FAILED", "CANCELLED"].includes(j.status)).slice(0, 10);
  const Section = ({ title, items }: { title: string; items: typeof a.jobs }) =>
    items.length ? (
      <section className="space-y-3">
        <h2 className="font-display text-[23px] font-bold">{title}</h2>
        <ul className="space-y-2.5">{items.map((j) => <JobCard key={j.id} j={j} />)}</ul>
      </section>
    ) : null;

  return (
    <Shell
      title="وكيلك على اللابتوب"
      subtitle="تقارير Excel وإيميلات، بتنعمل على لابتوبك وما بتنبعت إلا بموافقتك."
      art={<div className="-mt-6 -ml-12"><Planet id="ag-p" r={50} light="#ffffff" base="#4fb3ff" band="#fff" ring /></div>}
    >
      <div className="space-y-6">
        <section className="hero-card">
          <div className="relative z-[1] flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${a.online ? "bg-success shadow-[0_0_10px_var(--color-success)]" : "bg-white/30"}`} aria-hidden />
            <h2 className="font-display text-[21px] font-bold">{!a.configured ? "لسا مش موصول" : a.online ? "اللابتوب شغّال" : "اللابتوب مطفي أو نايم"}</h2>
          </div>
          <p className="meta relative z-[1] mt-2 text-[14px] leading-relaxed">
            {!a.configured
              ? "بيحتاج خطوة وحدة على لابتوبك: تشغيل Claude Code مع سكربت صغير بيسأل التطبيق كل دقيقة «شو في شغل؟». الخطوات بتوصلك برسالة الطلبات."
              : a.online
                ? "أي مهمة بتبعتها هلّق بيبلّش فيها خلال دقيقة."
                : `آخر مرة بيّن ${a.seenAt ? new Date(a.seenAt).toLocaleString("ar", { weekday: "long", hour: "numeric", minute: "2-digit" }) : "ما بيّن لسا"}. المهام بتستنى لحد ما يصحى.`}
          </p>
          <ol className="relative z-[1] mt-4 grid grid-cols-3 gap-2 text-center text-[12.5px]">
            {["إنت بتطلب من هون", "الوكيل بيحضّر على اللابتوب", "إنت بتوافق، وهو بيبعت"].map((s, i) => (
              <li key={s} className="rounded-2xl bg-white/5 px-2 py-3"><b className="block font-display text-[20px] text-gold tnum">{i + 1}</b>{s}</li>
            ))}
          </ol>
        </section>

        <NewJob />

        <Section title="بيستنى موافقتك" items={approvals} />
        <Section title="شغّال" items={active} />
        <Section title="تقارير مجدولة" items={scheduled} />
        <Section title="آخر شي" items={history} />

        {a.jobs.length === 0 && (
          <p className="card p-5 text-center text-[15px] leading-relaxed text-muted">ما في مهام لسا. ابدأ بتقرير المبيعات الأسبوعي: بتختار اليوم، والوكيل بيجهّزه كل أسبوع وبيستناك توافق.</p>
        )}

        <p className="text-center text-[12.5px] leading-relaxed text-muted">
          ملفات الشركة وأرقامها ما بتطلع من لابتوبك. هون بس عنوان المهمة وحالتها، وأي رقم بالملخّص بينشال قبل ما ينحفظ.
        </p>
      </div>
    </Shell>
  );
}
