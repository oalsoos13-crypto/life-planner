"use client";
// صوت المستشار بالمتصفح: قراءة عربية (Web Speech) وإشارة لتحريك الشفايف. ما في كلفة ولا سيرفر.
// المتصفح ما بيعطي الصوت نفسه، فالشفايف بتمشي على إيقاع مقاطع محسوب + نبضة مع كل كلمة.

export type MouthDriver = { mouth: number; speaking: boolean; listening: boolean; pulse: number };
export const newDriver = (): MouthDriver => ({ mouth: 0, speaking: false, listening: false, pulse: 0 });

/** نص نظيف للقراءة: بدون رموز Markdown ولا مراجع بين قوسين لاتينية */
export function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>`~|]/g, " ")
    .replace(/\(([A-Za-z0-9 .,'·&-]+)\)/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;
/** أحسن صوت عربي على الجهاز. الشامي/الأردني إذا موجود، بعدين أي عربي */
export function arabicVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ar"));
  const pref = ["ar-jo", "ar-sy", "ar-lb", "ar-ps", "ar-kw", "ar-sa", "ar-ae", "ar-eg"];
  vs.sort((a, b) => {
    const ia = pref.indexOf(a.lang.toLowerCase()), ib = pref.indexOf(b.lang.toLowerCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || Number(b.localService) - Number(a.localService);
  });
  cachedVoice = vs[0] ?? null;
  return cachedVoice;
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** بيقرأ النص (مقطّع لجمل عشان أندرويد بيقطع النصوص الطويلة) وبيحرّك driver. بيرجع دالة إيقاف */
export function speak(text: string, d: MouthDriver, onEnd?: () => void): () => void {
  if (!canSpeak()) return () => {};
  const synth = window.speechSynthesis;
  synth.cancel();
  const parts = speakable(text).split(/(?<=[.!؟?،\n])\s+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return () => {};
  let stopped = false, raf = 0;
  const t0 = performance.now();
  const tick = () => {
    if (stopped) return;
    const t = (performance.now() - t0) / 1000;
    // مقاطع ~6 بالثانية مع تذبذب، والنبضة بتخفت لحالها
    const syll = Math.abs(Math.sin(t * Math.PI * 6.2)) * (0.55 + 0.45 * Math.sin(t * 2.3) ** 2);
    d.pulse *= 0.86;
    const target = d.speaking ? Math.min(1, 0.12 + syll * 0.7 + d.pulse) : 0;
    d.mouth += (target - d.mouth) * 0.45;
    raf = requestAnimationFrame(tick);
  };
  const finish = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    d.speaking = false;
    d.mouth = 0;
    onEnd?.();
  };
  const voice = arabicVoice();
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = voice?.lang ?? "ar-SA";
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 0.95;
    u.onstart = () => { d.speaking = true; };
    u.onboundary = () => { d.pulse = 0.35; };
    if (i === parts.length - 1) { u.onend = finish; u.onerror = finish; }
    synth.speak(u);
  });
  raf = requestAnimationFrame(tick);
  return () => { synth.cancel(); finish(); };
}

// ── سماع سؤال واحد بالصوت (نفس واجهة الالتقاط) ──
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};
const getRec = (): (new () => Rec) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const canListen = () => !!getRec();

/** بيسمع جملة وحدة. onText بيوصله النص لحظة بلحظة، وonDone النهائي */
export function listenOnce(onText: (t: string) => void, onDone: (t: string) => void, onError: (m: string) => void): () => void {
  const R = getRec();
  if (!R) { onError("جهازك ما بيدعم الحكي هون. اكتب سؤالك."); return () => {}; }
  const r = new R();
  r.lang = "ar-JO";
  r.continuous = false;
  r.interimResults = true;
  let last = "";
  r.onresult = (e) => {
    last = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim();
    onText(last);
  };
  r.onerror = (e) => onError(e.error === "not-allowed" ? "لازم تسمح للمايك من إعدادات المتصفح" : "ما سمعتك منيح، جرّب كمان مرة");
  r.onend = () => onDone(last);
  r.start();
  return () => r.stop();
}
