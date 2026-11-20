"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { captureText } from "@/app/today/actions";

// واجهة التعرّف على الصوت بالمتصفح (كروم أندرويد بيدعمها بالعربي). ما في تحميل ولا كلفة.
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const getRec = (): (new () => Rec) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/**
 * الالتقاط (مخطط المنتج): بتحكي قد ما بدك أو بتكتب، وبينحفظ بالصندوق.
 * التسجيل بدون حد زمني: إذا المتصفح وقّف بعد سكوت، منرجع نشغّله لحالنا لحد ما توقّف إنت.
 */
export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rec = useRef<Rec | null>(null);
  const want = useRef(false);
  const usedVoice = useRef(false);
  const supported = typeof window !== "undefined" && !!getRec();

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  const stop = () => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
    setInterim("");
  };

  useEffect(() => {
    if (!open) stop();
  }, [open]);

  const listen = () => {
    const R = getRec();
    if (!R) return;
    const r = new R();
    r.lang = "ar-JO";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let fin = "";
      let mid = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else mid += res[0].transcript;
      }
      if (fin) setText((t) => (t ? t.trimEnd() + " " : "") + fin.trim());
      setInterim(mid);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") {
        want.current = false;
        setError("لازم تسمح للتطبيق يستخدم المايك من إعدادات المتصفح");
      }
    };
    r.onend = () => {
      if (want.current) r.start(); // بدون حد زمني
      else setListening(false);
    };
    rec.current = r;
    want.current = true;
    usedVoice.current = true;
    setError(null);
    setSaved(false);
    setListening(true);
    r.start();
  };

  const save = () => {
    stop();
    const all = (text + " " + interim).trim();
    if (!all) return;
    start(async () => {
      const r = await captureText(all, usedVoice.current ? "VOICE" : "TEXT");
      if (r.ok) {
        setText("");
        setSeconds(0);
        usedVoice.current = false;
        setSaved(true);
        if ("vibrate" in navigator) navigator.vibrate?.(10);
      } else setError(r.message);
    });
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Sheet open={open} onClose={onClose} title="احكي أو اكتب">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={listening ? stop : listen}
            disabled={!supported}
            aria-pressed={listening}
            aria-label={listening ? "وقّف التسجيل" : "ابدأ التسجيل"}
            className={`orb relative flex h-28 w-28 items-center justify-center rounded-full transition disabled:opacity-40 ${listening ? "scale-105" : ""}`}
            style={listening ? { boxShadow: "0 0 0 14px color-mix(in srgb, var(--color-gold-deco) 18%, transparent), 0 0 0 30px color-mix(in srgb, var(--color-gold-deco) 8%, transparent), 0 0 80px var(--glow)" } : undefined}
          >
            <Icon name={listening ? "Pause" : "Mic"} size={42} strokeWidth={1.8} />
          </button>
          <p className="text-[14px] text-muted" aria-live="polite">
            {!supported ? "متصفحك ما بيدعم التسجيل الصوتي. اكتب تحت." : listening ? <>عم يسمعك · <bdi className="tnum font-bold text-ink">{mm}:{ss}</bdi> · احكي قد ما بدك</> : "اكبس واحكي عن يومك، فكرة، مصروف، أي شي"}
          </p>
        </div>

        <label className="block">
          <span className="eyebrow mb-1 block">{listening ? "عم يكتب كلامك" : "كلامك"}</span>
          <textarea
            rows={5}
            value={text + (interim ? (text ? " " : "") + interim : "")}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
            placeholder="مثلاً: مشيت نص ساعة، المدير طلب تقرير المبيعات لبكرة، دفعت 12 دينار غدا…"
            className="font-display text-[18px] leading-relaxed"
          />
        </label>
        {error && <p className="text-[15px] text-danger">{error}</p>}
        <button type="button" className="btn btn-primary w-full" aria-busy={pending} onClick={save} disabled={!text.trim() && !interim.trim()}>
          {pending ? "عم يحفظ…" : "احفظ"}
        </button>
        {saved && <p className="saved-flash text-center text-[15px] text-success">✓ انحفظ بصندوق الالتقاط</p>}
        <p className="text-center text-[13px] text-muted">هلق بينحفظ كما هو. لما نبني المستشار، رح يفرزه لحاله لمهام ومصاريف وعادات ويربطه بأهدافك.</p>
      </div>
    </Sheet>
  );
}
