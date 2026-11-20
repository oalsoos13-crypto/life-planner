"use client";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { PURPOSES, PURPOSE_LABEL, limitFor, suggestSlots, waLink, type Purpose } from "@/modules/outreach";
import type { Channel, OutreachView } from "@/modules/outreach/server";
import * as A from "@/app/connect/actions";

const fmtWhen = (d: Date | string) => new Date(d).toLocaleString("ar", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuwait" });

/** واتساب شخصي: المسودة بتنكتب هون، والإرسال من واتساب بإيدك (بدون أتمتة، بدون خطر حظر) */
export function PersonalDraft({ people, preselect }: { people: OutreachView["people"]; preselect: string | null }) {
  const [purpose, setPurpose] = useState<Purpose>("CHECKIN");
  const [personId, setPersonId] = useState<string | null>(preselect);
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [by, setBy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const write = () => start(async () => {
    const r = await A.draftPersonal(purpose, personId, note);
    if (r.ok && r.value) { setText(r.value.text); setBy(r.value.by === "CLAUDE" ? "بأسلوبك" : "قالب جاهز"); }
  });
  return (
    <section className="card space-y-4 p-4" aria-labelledby="wa-p">
      <div className="flex items-baseline justify-between">
        <h2 id="wa-p" className="font-display text-[21px] font-bold">رسالة واتساب</h2>
        <span className="text-[12.5px] text-muted">مسودة، وإنت بتبعتها</span>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="الغرض">
        {PURPOSES.map((p) => <button key={p} type="button" role="radio" aria-checked={purpose === p} onClick={() => setPurpose(p)} className={`btn btn-sm ${purpose === p ? "btn-primary" : ""}`}>{PURPOSE_LABEL[p]}</button>)}
      </div>
      <label className="block">
        <span className="mb-1 block font-bold">لمين</span>
        <select value={personId ?? ""} onChange={(e) => setPersonId(e.target.value || null)}>
          <option value="">بختار من واتساب</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.relation ? ` · ${p.relation}` : ""}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-bold">شي بدك تحكيه؟ <span className="font-normal text-muted">(اختياري)</span></span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: نجح بالامتحان، أو تأخرت عليه بالرد" />
      </label>
      <button type="button" className="btn w-full" onClick={write} disabled={pending}><Icon name="Sparkles" size={16} /> {pending ? "عم بكتب…" : text ? "اكتبها من جديد" : "اكتبلي ياها"}</button>
      {text && (
        <div className="space-y-2">
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-label="المسودة" />
          {by && <p className="text-[12.5px] text-muted">{by}. عدّل براحتك.</p>}
          <div className="flex gap-2">
            <a href={waLink(text)} target="_blank" rel="noopener noreferrer" className="btn btn-primary flex-1"><Icon name="Send" size={16} /> افتح واتساب</a>
            <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>{copied ? "انسخت ✓" : "انسخ"}</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** منشور للمجدّد: فكرة ← مسودة ← منصات ← وقت ← جدولة عبر Postiz */
export function SocialComposer({ connected, claude }: { connected: boolean; claude: boolean }) {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [chans, setChans] = useState<Channel[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [slots, setSlots] = useState<Date[]>([]);
  const [when, setWhen] = useState<string>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const s = suggestSlots(new Date());
    setSlots(s);
    setWhen(s[0]?.toISOString() ?? "");
    if (connected) A.channels().then((r) => setChans(r.ok ? r.value ?? [] : []));
  }, [connected]);
  const selected = (chans ?? []).filter((c) => picked.includes(c.id));
  const max = selected.length ? Math.min(...selected.map((c) => limitFor(c.identifier))) : null;
  const len = [...content].length;
  const submit = (asDraft: boolean) => start(async () => {
    const r = await A.schedulePost(content, selected, when, asDraft);
    setMsg(r.ok ? { ok: true, text: connected ? (asDraft ? "انحفظت مسودة بـ Postiz" : `انجدول ${fmtWhen(when)}`) : "انحفظ بالتطبيق، وبينجدول لما ينوصل Postiz" } : { ok: false, text: r.message });
    if (r.ok) { setContent(""); setTopic(""); }
  });
  return (
    <section className="card space-y-4 p-4" aria-labelledby="soc-h">
      <div className="flex items-baseline justify-between">
        <h2 id="soc-h" className="font-display text-[21px] font-bold">منشور للمجدّد</h2>
        <span className={`text-[12.5px] ${connected ? "text-success" : "text-muted"}`}><bdi dir="ltr">Postiz</bdi> {connected ? "موصول" : "مش موصول"}</span>
      </div>
      <div className="flex gap-2">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="الفكرة: ميزة التذكير بالأهداف" aria-label="فكرة المنشور" className="flex-1" />
        <button type="button" className="btn shrink-0" disabled={!claude || !topic.trim() || pending} onClick={() => start(async () => { const r = await A.draftSocial(topic); if (r.ok && r.value) setContent(r.value); else if (!r.ok) setMsg({ ok: false, text: r.message }); })}>
          <Icon name="Sparkles" size={16} /> اكتبه
        </button>
      </div>
      <label className="block">
        <textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="نص المنشور" aria-label="نص المنشور" />
        <span className={`mt-1 block text-end text-[12.5px] tnum ${max && len > max ? "text-danger" : "text-muted"}`}>{len}{max ? ` / ${max}` : ""}</span>
      </label>
      {connected && (
        <div className="flex flex-wrap gap-2" aria-label="المنصات">
          {chans === null && <span className="text-[14px] text-muted">عم جيب منصاتك…</span>}
          {chans?.length === 0 && <span className="text-[14px] text-muted">ما في منصات موصولة بـ Postiz لسا.</span>}
          {chans?.map((c) => (
            <button key={c.id} type="button" aria-pressed={picked.includes(c.id)} onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))} className={`btn btn-sm ${picked.includes(c.id) ? "btn-primary" : ""}`}>
              {c.name} <span className="text-[11px] opacity-70" dir="ltr">{c.identifier}</span>
            </button>
          ))}
        </div>
      )}
      <div>
        <span className="mb-1 block font-bold">إمتى</span>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => <button key={s.toISOString()} type="button" onClick={() => setWhen(s.toISOString())} className={`btn btn-sm ${when === s.toISOString() ? "btn-primary" : ""}`}>{fmtWhen(s)}</button>)}
        </div>
        <p className="mt-1 text-[12.5px] text-muted">أوقات الذروة بالخليج تقريباً: الظهر وبعد العشا. بتتعدّل حسب أرقامك.</p>
      </div>
      {msg && <p className={`text-[14px] ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary flex-1" disabled={pending || !content.trim() || (connected && !selected.length)} onClick={() => submit(false)}>{connected ? "جدوله" : "احفظه"}</button>
        {connected && <button type="button" className="btn" disabled={pending || !content.trim() || !selected.length} onClick={() => submit(true)}>مسودة</button>}
      </div>
    </section>
  );
}

const POST_STATUS: Record<string, string> = { DRAFT: "مسودة", SCHEDULED: "مجدول", FAILED: "ما زبط" };
export function PostsList({ posts }: { posts: OutreachView["posts"] }) {
  const [pending, start] = useTransition();
  if (!posts.length) return null;
  return (
    <ul className="card divide-y divide-line">
      {posts.map((p) => (
        <li key={p.id} className={`p-4 ${pending ? "opacity-60" : ""}`}>
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className={p.status === "FAILED" ? "text-danger" : p.status === "SCHEDULED" ? "text-success" : "text-muted"}>{POST_STATUS[p.status]} · {fmtWhen(p.scheduledAt)}</span>
            <button type="button" className="btn btn-text btn-sm h-8 w-8 p-0 text-muted" aria-label="احذف" onClick={() => start(async () => { await A.removePost(p.id); })}><Icon name="Trash2" size={14} /></button>
          </div>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed">{p.content}</p>
          {p.channels.length > 0 && <p className="mt-1 text-[12.5px] text-muted">{p.channels.map((c) => c.name).join("، ")}</p>}
          {p.error && <p className="mt-1 text-[12.5px] text-danger">{p.error}</p>}
        </li>
      ))}
    </ul>
  );
}

/** واتساب بزنس للمجدّد: معلومات الرد الآلي، والمحادثات */
export function WaBusiness({ connected, claude, faq, auto, threads }: { connected: boolean; claude: boolean; faq: string; auto: boolean; threads: OutreachView["threads"] }) {
  const [text, setText] = useState(faq);
  const [on, setOn] = useState(auto);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="space-y-3" aria-labelledby="wab-h">
      <div className="flex items-baseline justify-between">
        <h2 id="wab-h" className="font-display text-[23px] font-bold">واتساب المجدّد</h2>
        <span className={`text-[12.5px] ${connected ? "text-success" : "text-muted"}`}>{connected ? "موصول" : "مش موصول لسا"}</span>
      </div>
      <div className="card space-y-3 p-4">
        <label className="flex items-start justify-between gap-3">
          <span><span className="block font-bold">رد آلي على العملاء</span><span className="block text-[13px] text-muted">بيعرّف عن حاله إنه مساعد آلي. إذا العميل طلب إنسان، أو السؤال عن دفع أو شكوى، بيوصّلها إلك.{!claude && <> بيحتاج مفتاح <bdi dir="ltr">Claude</bdi>.</>}</span></span>
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-5 w-5" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">شو لازم يعرف عن المجدّد</span>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"شو التطبيق، الميزات، المجاني والاشتراك وسعره، كيف ينزّلوه، أسئلة متكررة وأجوبتها…"} />
        </label>
        <button type="button" className="btn w-full" disabled={pending} onClick={() => start(async () => { await A.saveBusiness(text, on); setSaved(true); setTimeout(() => setSaved(false), 1500); })}>{saved ? "انحفظ ✓" : "احفظ"}</button>
      </div>
      {threads.length > 0 ? (
        <ul className="space-y-2.5">{threads.map((t) => <WaThread key={t.peer} t={t} connected={connected} />)}</ul>
      ) : (
        <p className="card p-5 text-center text-[15px] text-muted">لما يوصل رقم المجدّد على واتساب بزنس، المحادثات بتطلع هون.</p>
      )}
    </section>
  );
}

function WaThread({ t, connected }: { t: OutreachView["threads"][number]; connected: boolean }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <li className="card p-4">
      <div className="flex items-baseline justify-between text-[13px]">
        <bdi dir="ltr" className="font-bold tnum">{t.label}</bdi>
        <span className={t.waiting ? "text-gold" : "text-muted"}>{t.waiting ? "بيستنى رد" : fmtWhen(t.last)}</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {t.messages.map((m) => (
          <li key={m.id} className={`flex ${m.direction === "IN" ? "justify-start" : "justify-end"}`}>
            <span className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14.5px] leading-relaxed ${m.direction === "IN" ? "bg-surface-2" : "bg-accent/20"}`}>
              {m.text}{m.auto && <span className="ms-1 text-[11px] text-muted">· آلي</span>}
            </span>
          </li>
        ))}
      </ul>
      {connected && (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await A.replyWa(t.peer, reply); if (r.ok) { setReply(""); setError(null); } else setError(r.message); }); }}>
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="رد بإيدك" aria-label="ردك" className="flex-1" />
          <button className="btn btn-sm shrink-0" disabled={pending || !reply.trim()}><Icon name="Send" size={15} /></button>
        </form>
      )}
      {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
    </li>
  );
}
