"use client";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { askAdvisor } from "@/app/today/actions";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const STARTERS = [
  "شو أهم شي لازم أعمله هالأسبوع؟",
  "ساعدني آخذ قرار، وطبّق عليه Premortem",
  "كيف ماشي بأولويات الربع؟",
  "عندي ساعتين فاضيين، شو أعمل فيهم؟",
];

/** محادثة المستشار: جواب أو قرار أول شي، وبعدين السبب، مع المرجع (المخطط: المستشار) */
export function AdvisorChat({ initial, connected }: { initial: Msg[]; connected: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setError(null);
    setQ("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", text: t }]);
    start(async () => {
      const r = await askAdvisor(t);
      if (r.ok) setMsgs((m) => [...m, { id: `a${Date.now()}`, role: "assistant", text: r.answer }]);
      else setError(r.message);
      requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: "smooth" }));
    });
  };

  return (
    <div className="space-y-4">
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
        <button type="submit" className="orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40" disabled={!q.trim() || pending || !connected} aria-label="ابعت">
          <Icon name="Send" size={18} />
        </button>
      </form>
    </div>
  );
}
