import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Planet } from "@/components/space/Planet";
import { KnowLegend, KnowOrbit } from "@/components/me/KnowOrbit";
import { AddFact, FactCard, LearnButton, People, Rejected } from "@/components/me/Profile";
import { AREA_LABEL } from "@/modules/profile";
import { getProfile, profileUseCases } from "@/modules/profile/server";
import { advisorConnected } from "@/modules/advisor/server";
import { getContext } from "@/lib/week";

export const dynamic = "force-dynamic";

// «شو بيعرف التطبيق عني» (مخطط المنتج: الملف الحي). كل شي هون قابل للتصحيح، والتصحيح هو الي بيخلّي المستشار «نسخة منك».
export default async function MePage() {
  const { today } = await getContext();
  await profileUseCases.refreshFromData(today);
  const p = await getProfile(today);
  const values = p.know.compass.values;
  const filled = p.byArea.filter((a) => a.facts.length);
  const empty = p.byArea.filter((a) => !a.facts.length && a.area !== "VALUES");

  return (
    <Shell
      title="شو بعرف عنك"
      subtitle="كل شي هون إنت بتأكّده أو بتصحّحه. هيك المستشار بيصير يفهمك."
      art={<div className="-mt-6 -ml-14"><Planet id="me-p" r={58} light="#ffffff" base="#7b66ff" band="#fff" ring /></div>}
    >
      <div className="space-y-6">
        <section className="hero-card">
          <h2 className="eyebrow relative z-[1]">قديش بيعرفني</h2>
          <div className="relative z-[1] mt-2"><KnowOrbit score={p.know.score} parts={p.know.parts} /></div>
          <div className="relative z-[1] mt-2"><KnowLegend parts={p.know.parts} /></div>
          {p.know.next && (
            <p className="relative z-[1] mt-4 border-t border-white/10 pt-3 font-display text-[19px] font-bold leading-snug">
              الي بيزيدها هلّق: {p.know.next.next}
            </p>
          )}
        </section>

        <LearnButton connected={advisorConnected()} />

        {p.pending > 0 && (
          <p className="text-center text-[15px]"><b className="gold-text tnum">{p.pending}</b> أشياء جديدة فهمتها عنك. راجعها: صح ولا لأ؟</p>
        )}

        <section className="space-y-3" aria-labelledby="val-h">
          <div className="flex items-baseline justify-between">
            <h2 id="val-h" className="font-display text-[23px] font-bold">قيمك</h2>
            <Link href="/compass" className="btn btn-text btn-sm -me-2">من البوصلة</Link>
          </div>
          {values.length ? (
            <ul className="card divide-y divide-line">
              {values.map((v) => (
                <li key={v.id} className="p-4">
                  <div className="font-bold">{v.text}</div>
                  {v.detail && <div className="text-[14px] text-muted">{v.detail}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/compass" className="card block p-4 text-[15px] text-muted active:bg-surface-2">لسا ما كتبت قيمك. ابدأ من البوصلة، هي أساس كل نصيحة ‹</Link>
          )}
        </section>

        {filled.map((a) => (
          <section key={a.area} className="space-y-3" aria-labelledby={`a-${a.area}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 id={`a-${a.area}`} className="font-display text-[23px] font-bold">{a.area === "VALUES" ? "قيم لاحظتها" : AREA_LABEL[a.area].title}</h2>
              <span className="text-[12.5px] text-muted">{AREA_LABEL[a.area].hint}</span>
            </div>
            <ul className="space-y-2.5">{a.facts.map((f) => <FactCard key={f.id} f={f} />)}</ul>
          </section>
        ))}

        <section className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold">لسا ما بعرف عنك</h2>
              <p className="text-[14px] text-muted">{empty.length ? empty.map((a) => AREA_LABEL[a.area].title).join("، ") : "غطّينا كل المجالات"}</p>
            </div>
            <AddFact />
          </div>
        </section>

        <People people={p.people} today={today} />

        <Rejected items={p.rejected} />

        <p className="text-center text-[12.5px] leading-relaxed text-muted">
          هاد ملف بقاعدة بياناتك الخاصة بس، مش بالكود. التطبيق ما بيتدرّب عليه؛ بيقرأه المستشار كل مرة بتسأله.
        </p>
      </div>
    </Shell>
  );
}
