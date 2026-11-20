"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { askAdvisor } from "@/app/today/actions";
import { Avatar3D } from "@/components/avatar/Avatar3D";
import { canListen, canSpeak, listenOnce, newDriver, speak } from "@/components/avatar/speech";

const GREETING = "أهلا عمر. أنا مستشارك. بعرف أولوياتك وأرقامك ويومك، واسألني أي شي: قرار، أولوية، أو شو تعمل بوقتك الفاضي.";
const VOICE_KEY = "advisor-voice";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const STARTERS = [
  "شو أهم شي لازم أعمله هالأسبوع؟",
  "ساعدني آخذ قرار، وطبّق عليه Premortem",
  "كيف ماشي بأولويات الربع؟",
  "عندي ساعتين فاضيين، شو أعمل فيهم؟",
];

/** محادثة المستشار: جواب أو قرار أول شي، وبعدين السبب، مع المرجع (المخطط: المستشار) */
export function AdvisorChat({ initial, connected, modelUrl }: { initial: Msg[]; connected: boolean; modelUrl?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  // الشخصية: صوت وشفايف (المخطط: المرحلة 4)
  const driver = useRef(newDriver()).current;
  const stopVoice = useRef<() => void>(() => {});
  const stopEar = useRef<() => void>(() => {});
  const [mode, setMode] = useState<"idle" | "speaking" | "listening">("idle");
  const [voiceOn, setVoiceOn] = useState(true);
  const [can, setCan] = useState({ speak: false, listen: false }); // بعد التحميل بس، عشان ما يختلف عن السيرفر
  useEffect(() => {
    setCan({ speak: canSpeak(), listen: canListen() });
    try { setVoiceOn(localStorage.getItem(VOICE_KEY) !== "off"); } catch {}
    // أندرويد بيحمّل الأصوات متأخر
    if (canSpeak()) window.speechSynthesis.getVoices();
    return () => { stopVoice.current(); stopEar.current(); };
  }, []);
  const toggleVoice = () => {
    const v = !voiceOn;
    setVoiceOn(v);
    if (!v) stopVoice.current();
    try { localStorage.setItem(VOICE_KEY, v ? "on" : "off"); } catch {}
  };
  const say = (text: string) => {
    if (!can.speak) return;
    stopVoice.current();
    setMode("speaking");
    stopVoice.current = speak(text, driver, () => setMode("idle"));
  };
  const hear = () => {
    stopVoice.current();
    setError(null);
    driver.listening = true;
    setMode("listening");
    stopEar.current = listenOnce(
      (t) => setQ(t),
      (t) => { driver.listening = false; setMode("idle"); if (t) send(t); },
      (m) => { driver.listening = false; setMode("idle"); setError(m); },
    );
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setError(null);
    setQ("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", text: t }]);
    start(async () => {
      const r = await askAdvisor(t);
      if (r.ok) {
        setMsgs((m) => [...m, { id: `a${Date.now()}`, role: "assistant", text: r.answer }]);
        if (voiceOn) say(r.answer);
      }
      else setError(r.message);
      requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: "smooth" }));
    });
  };

  return (
    <div className="space-y-4">
      <section className="hero-card !p-0 overflow-hidden">
        <Avatar3D driver={driver} modelUrl={modelUrl} className="relative z-[1] h-[280px] w-full" />
        <div className="relative z-[1] flex items-center gap-2 px-4 pb-4">
          <p className="min-w-0 flex-1 text-[14px] text-white/80" aria-live="polite">
            {mode === "speaking" ? "عم يحكي…" : mode === "listening" ? "عم يسمعك… احكي" : pending ? "عم يفكّر…" : "اكبس المايك واسأله بصوتك"}
          </p>
          {mode === "speaking" ? (
            <button type="button" className="btn btn-sm" onClick={() => { stopVoice.current(); setMode("idle"); }}><Icon name="Pause" size={16} /> وقّف</button>
          ) : (
            <button type="button" className="btn btn-sm" onClick={() => say(msgs.findLast((m) => m.role === "assistant")?.text ?? GREETING)} disabled={!can.speak}>
              <Icon name="Sparkles" size={16} /> {msgs.some((m) => m.role === "assistant") ? "عيد" : "سلّم"}
            </button>
          )}
          <button type="button" className="btn btn-sm h-10 w-10 p-0" onClick={toggleVoice} aria-pressed={voiceOn} aria-label={voiceOn ? "اسكّت الصوت" : "شغّل الصوت"}>
            <Icon name={voiceOn ? "Volume2" : "VolumeX"} size={17} />
          </button>
        </div>
      </section>
      {!connected && (
        <p className="card p-4 text-[14px] leading-relaxed text-warning">
          المستشار جاهز بالكود، بس لسا مش موصول. بس ينحط مفتاح Claude بإعدادات السيرفر، بيصير يجاوبك ويحلّل كلامك بعمق.
        </p>
      )}
      {msgs.length === 0 && (
        <div className="grid gap-2">
          {STARTERS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} disabled={!connected} className="card px-4 py-3 text-start text-[15px] disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-3" aria-live="polite">
        {msgs.map((m) => (
          <li key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-[15.5px] leading-relaxed ${
                m.role === "user" ? "rounded-ss-md bg-accent text-on-accent dark:[background:var(--gold-metal)]" : "card rounded-se-md"
              }`}
            >
              {m.text}
              {m.role === "assistant" && can.speak && (
                <button type="button" className="mt-1 flex items-center gap-1 text-[13px] text-muted" onClick={() => say(m.text)}>
                  <Icon name="Volume2" size={14} /> اسمع
                </button>
              )}
            </div>
          </li>
        ))}
        {pending && (
          <li className="flex justify-end">
            <div className="card flex items-center gap-2 rounded-[22px] px-4 py-3 text-[14px] text-muted">
              <span className="orb inline-block h-4 w-4 animate-pulse rounded-full" /> عم يفكّر…
            </div>
          </li>
        )}
      </ul>
      {error && <p className="text-[14px] text-danger">{error}</p>}
      <div ref={end} />
      <form
        onSubmit={(e) => { e.preventDefault(); send(q); }}
        className="sticky bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] flex items-end gap-2 rounded-[26px] border border-line bg-card/90 p-2 backdrop-blur-xl"
      >
        <textarea
          rows={1}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q); } }}
          placeholder="اسأل مستشارك…"
          aria-label="سؤالك للمستشار"
          className="max-h-40 min-h-11 flex-1 resize-none border-0 bg-transparent"
        />
        {can.listen && !q.trim() ? (
          <button type="button" onClick={hear} disabled={pending || !connected || mode === "listening"} className="orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40" aria-label="اسأل بصوتك">
            <Icon name="Mic" size={18} />
          </button>
        ) : (
        <button type="submit" className="orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40" disabled={!q.trim() || pending || !connected} aria-label="ابعت">
          <Icon name="Send" size={18} />
        </button>
        )}
      </form>
    </div>
  );
}
