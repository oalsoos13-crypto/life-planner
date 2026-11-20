"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { KIND_LABEL, STATUS_LABEL, standingAllowed, type JobKind } from "@/modules/agent";
import type { JobView } from "@/modules/agent/server";
import * as A from "@/app/agent/actions";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// قوالب جاهزة (Hick: خيارات قليلة واضحة) من شغلك الفعلي بالمبيعات
const TEMPLATES: { kind: JobKind; title: string; instructions: string; repeatDay?: number }[] = [
  {
    kind: "EXCEL_REPORT",
    title: "تقرير المبيعات الأسبوعي",
    instructions: "افتح ملف المبيعات الأخير بالمجلد. اعمل ملف Excel جديد فيه: المبيعات مقابل التارجت لكل مندوب ولكل منطقة، نسبة التحقيق، أعلى 10 أصناف وأوطى 10، والفرق عن الأسبوع الماضي. حط جدول ملخّص بأول شيت وجراف. جهّز إيميل للمدير فيه 3 نقاط رئيسية والملف مرفق، وما تبعته.",
    repeatDay: 0,
  },
  { kind: "EMAIL", title: "مسودة إيميل", instructions: "اكتب إيميل لـ ___ عن ___. نبرة مهنية ومختصرة. جهّزه كمسودة بالـ Outlook وما تبعته." },
  { kind: "OTHER", title: "رتّب ملفات", instructions: "رتّب الملفات بالمجلد حسب الشهر والنوع، وما تحذف شي." },
];

const tone = (s: JobView["status"]) =>
  s === "NEEDS_APPROVAL" ? "text-gold" : s === "FAILED" ? "text-danger" : s === "RUNNING" || s === "SENDING" || s === "APPROVED" ? "text-success" : "text-muted";

export function NewJob() {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(TEMPLATES[0]);
  const [weekly, setWeekly] = useState(true);
  const [day, setDay] = useState(0);
  const [standing, setStanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const repeatDay = t.kind === "EXCEL_REPORT" && weekly ? day : null;
  return (
    <>
      <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(true)}><Icon name="Plus" size={18} /> مهمة للوكيل</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="شو بدك الوكيل يعمل؟">
        <form
          key={t.title}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await A.createJob({ kind: t.kind, title: String(fd.get("title")), instructions: String(fd.get("instructions")), folder: String(fd.get("folder") ?? ""), repeatDay, standing: standing && standingAllowed(t.kind, repeatDay) });
              if (!r.ok) return setError(r.message);
              setError(null); setOpen(false);
            });
          }}
        >
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="النوع">
            {TEMPLATES.map((x) => (
              <button key={x.title} type="button" role="radio" aria-checked={t === x} className={`btn btn-sm ${t === x ? "btn-primary" : ""}`} onClick={() => { setT(x); setDay(x.repeatDay ?? 0); }}>{x.title}</button>
            ))}
          </div>
          <label className="block"><span className="mb-1 block font-bold">العنوان</span><input name="title" defaultValue={t.title} required /></label>
          <label className="block"><span className="mb-1 block font-bold">شو يعمل بالضبط</span><textarea name="instructions" rows={5} defaultValue={t.instructions} required /></label>
          <label className="block"><span className="mb-1 block font-bold">المجلد على اللابتوب</span><input name="folder" dir="ltr" placeholder="Sales/Weekly" /><span className="mt-1 block text-[13px] text-muted">بس الاسم. الملفات نفسها ما بتطلع من اللابتوب.</span></label>
          {t.kind === "EXCEL_REPORT" && (
            <div className="card space-y-3 p-4">
              <label className="flex items-center justify-between gap-3"><span className="font-bold">كل أسبوع</span><input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-5 w-5" /></label>
              {weekly && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d, i) => <button key={d} type="button" onClick={() => setDay(i)} className={`btn btn-sm ${day === i ? "btn-primary" : ""}`}>{d}</button>)}
                  </div>
                  <label className="flex items-start justify-between gap-3">
                    <span><span className="block font-bold">إذن دائم</span><span className="block text-[13px] text-muted">بيبعته لحاله كل أسبوع بدون ما يستنى موافقتك. بتقدر تلغيه أي وقت.</span></span>
                    <input type="checkbox" checked={standing} onChange={(e) => setStanding(e.target.checked)} className="mt-1 h-5 w-5" />
                  </label>
                </>
              )}
            </div>
          )}
          {error && <p className="text-[14px] text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>ابعتها للوكيل</button>
        </form>
      </Sheet>
    </>
  );
}

export function JobCard({ j }: { j: JobView }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (f: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await f(); setError(r.ok ? null : r.message ?? "صار خطأ"); });
  const scheduled = j.repeatDay != null && (j.status === "DONE" || j.status === "FAILED") && j.nextRunAt;
  return (
    <li className={`card p-4 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-bold leading-snug">{j.title}</h3>
        <span className={`shrink-0 text-[13px] font-semibold ${tone(j.status)}`}>{scheduled && !j.finishedAt ? "مجدولة" : STATUS_LABEL[j.status]}</span>
      </div>
      <div className="mt-1 text-[13px] text-muted">
        {KIND_LABEL[j.kind]}
        {j.repeatDay != null && ` · كل ${DAYS[j.repeatDay]}`}
        {j.standing && " · إذن دائم"}
        {scheduled && ` · الجاي ${new Date(j.nextRunAt!).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "short" })}`}
      </div>
      {j.summary && <p className="mt-2 text-[14.5px] leading-relaxed">{j.summary}</p>}
      {error && <p className="mt-2 text-[14px] text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {j.status === "NEEDS_APPROVAL" && (
          <>
            <button type="button" className="btn btn-primary btn-sm flex-1" onClick={() => run(() => A.actOnJob(j.id, "APPROVE"))}><Icon name="Send" size={15} /> ابعت</button>
            <button type="button" className="btn btn-sm" onClick={() => run(() => A.actOnJob(j.id, "REJECT"))}>لا تبعت</button>
          </>
        )}
        {(j.status === "QUEUED" || j.status === "APPROVED") && <button type="button" className="btn btn-sm" onClick={() => run(() => A.actOnJob(j.id, "CANCEL"))}>ألغيها</button>}
        {(j.status === "FAILED" || j.status === "DONE" || j.status === "CANCELLED") && (
          <button type="button" className="btn btn-sm" onClick={() => run(() => A.actOnJob(j.id, "RETRY"))}><Icon name="RotateCcw" size={15} /> {j.repeatDay != null ? "شغّلها هلّق" : "عيدها"}</button>
        )}
        {standingAllowed(j.kind, j.repeatDay) && (
          <button type="button" className="btn btn-text btn-sm" onClick={() => run(() => A.setStanding(j.id, !j.standing))}>{j.standing ? "شيل الإذن الدائم" : "عطيه إذن دائم"}</button>
        )}
        {j.status !== "RUNNING" && j.status !== "SENDING" && (
          <button type="button" className="btn btn-text btn-sm ms-auto h-9 w-9 p-0 text-muted" aria-label="احذف المهمة" onClick={() => run(async () => A.removeJob(j.id))}><Icon name="Trash2" size={15} /></button>
        )}
      </div>
    </li>
  );
}
