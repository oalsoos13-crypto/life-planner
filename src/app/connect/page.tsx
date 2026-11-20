import { Shell } from "@/components/Shell";
import { Planet } from "@/components/space/Planet";
import { PersonalDraft, PostsList, SocialComposer, WaBusiness } from "@/components/connect/Connect";
import { getOutreach, outreachUseCases as O } from "@/modules/outreach/server";
import { advisorConnected } from "@/modules/advisor/server";

export const dynamic = "force-dynamic";

// التواصل (مخطط المنتج: الواتساب والسوشال). الشخصي مسودات بس؛ المجدّد عبر APIs رسمية (Postiz وWhatsApp Cloud).
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [{ p }, o] = await Promise.all([searchParams, getOutreach()]);
  const claude = advisorConnected();
  return (
    <Shell
      title="التواصل"
      subtitle="رسائل لناسك بأسلوبك، ومنشورات المجدّد، وواتساب العملاء."
      art={<div className="-mt-6 -ml-12"><Planet id="cn-p" r={50} light="#ffffff" base="#3ddc97" band="#fff" ring /></div>}
    >
      <div className="space-y-6">
        <PersonalDraft people={o.people} preselect={o.people.some((x) => x.id === p) ? p! : null} />
        <section className="space-y-3">
          <SocialComposer connected={O.postizConnected()} claude={claude} />
          <PostsList posts={o.posts} />
        </section>
        <WaBusiness connected={O.waConnected()} claude={claude} faq={o.faq} auto={o.autoReply} threads={o.threads} />
        <p className="text-center text-[12.5px] leading-relaxed text-muted">
          واتساب الشخصي ما فيه أي إرسال آلي (عشان ما ينحظر رقمك). المنشورات وواتساب المجدّد عبر الواجهات الرسمية بس.
        </p>
      </div>
    </Shell>
  );
}
