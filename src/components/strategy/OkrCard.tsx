"use client";
import { useState, useTransition } from "react";
import { Ring } from "@/components/ui/Ring";
import { Dot } from "@/components/ui/Dot";
import { Sheet } from "@/components/ui/Sheet";
import { MetricForm } from "./MetricForm";
import { KR_MAX, OKR_TYPE_LABEL, PERSPECTIVE_LABEL, isOkrSuccess, looksLikeTask, type OkrType } from "@/modules/strategy";
import * as A from "@/app/strategy/actions";
import type { MetricView, StrategyView } from "@/modules/strategy/server";

type Okr = StrategyView["okrs"][number];
type Sg = StrategyView["strategicGoals"][number];

const fmt = (n: number | null) => (n == null ? "؟" : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** بطاقة OKR (دليل الواجهات §4.7): عنوان + علامة + نتائج رئيسية بأشرطة. كبسة على النتيجة = تسجيل رقم */
export function OkrCard({ okr, sgs }: { okr: Okr; sgs: Sg[] }) {
  const [sheet, setSheet] = useState<null | { kind: "checkin"; kr: MetricView } | { kind: "editKr"; kr: MetricView } | { kind: "addKr" } | { kind: "edit" }>(null);
  const sg = sgs.find((s) => s.id === okr.strategicGoalId);
  const close = () => setSheet(null);
  const success = okr.score != null && isOkrSuccess(okr.score, okr.type);

  return (
    <article className="card rise p-4">
      <header className="flex items-start gap-3">
        <Ring value={okr.score} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="badge bg-accent-soft font-bold text-accent">أولوية {okr.rank}</span>
            <span className="badge">{OKR_TYPE_LABEL[okr.type]} · {okr.type === "COMMITTED" ? "النجاح 1.0" : "النجاح 0.7"}</span>
            {success && <span className="badge bg-gold-soft text-gold">✓ وصلت</span>}
          </div>
          <h3 className="text-[19px] font-extrabold leading-snug">{okr.title}</h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-[15px] text-muted">
            <Dot color={okr.pillar.color} />
            <span>{okr.pillar.name}</span>
            {okr.weeklyHours != null && <span>· <bdi className="tnum">{okr.weeklyHours}</bdi> س/أسبوع</span>}
          </div>
        </div>
        <button type="button" className="btn btn-text btn-sm -me-2 text-muted" onClick={() => setSheet({ kind: "edit" })} aria-label="عدّل الأولوية">
          تعديل
        </button>
      </header>

      <ul className="mt-4 space-y-1">
        {okr.krs.map((kr) => (
          <li key={kr.id}>
            <button type="button" onClick={() => setSheet({ kind: "checkin", kr })} className="-mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-2 text-start transition active:bg-surface-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 font-bold leading-snug">
                  {kr.name}
                  {kr.role === "LEADING" && <span className="ms-1.5 text-[13px] font-medium text-muted">(قائد)</span>}
                </span>
                <span className="tnum shrink-0 text-[15px] text-muted">
                  <bdi className="font-bold text-ink">{fmt(kr.latest ?? kr.start)}</bdi> من <bdi>{fmt(kr.target)}</bdi> {kr.unit && <bdi>{kr.unit}</bdi>}
                </span>
              </div>
              {looksLikeTask(kr) ? (
                <div className="mt-1 text-[13px] text-warning">⚠ حدّد رقم الهدف · اكبس</div>
              ) : (
                <div className="bar mt-1.5" aria-label={`التقدم ${Math.round((kr.progress ?? 0) * 100)}%`}>
                  <span style={{ width: `${(kr.progress ?? 0) * 100}%` }} />
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[15px]">
        <span className="min-w-0 text-muted">
          {sg ? <>بيخدم: <span className="text-ink">{sg.title}</span></> : <span className="text-warning">⚠ مش مربوط بهدف استراتيجي</span>}
        </span>
        {okr.krs.length < KR_MAX && (
          <button type="button" className="btn btn-text btn-sm" onClick={() => setSheet({ kind: "addKr" })}>+ نتيجة رئيسية</button>
        )}
      </div>

      <Sheet open={sheet?.kind === "checkin"} onClose={close} title={sheet?.kind === "checkin" ? sheet.kr.name : ""}>
        {sheet?.kind === "checkin" && <CheckIn kr={sheet.kr} onDone={close} onEdit={() => setSheet({ kind: "editKr", kr: sheet.kr })} />}
      </Sheet>
      <Sheet open={sheet?.kind === "editKr"} onClose={close} title="عدّل النتيجة الرئيسية">
        {sheet?.kind === "editKr" && (
          <MetricForm
            initial={{ name: sheet.kr.name, unit: sheet.kr.unit ?? "", start: sheet.kr.start?.toString() ?? "", target: sheet.kr.target?.toString() ?? "", direction: sheet.kr.direction, role: sheet.kr.role }}
            submitLabel="احفظ النتيجة"
            onSubmit={async (m) => { const r = await A.editMetric(sheet.kr.id, m); if (r.ok) close(); return r; }}
            onDelete={async () => { await A.removeMetric(sheet.kr.id); close(); }}
          />
        )}
      </Sheet>
      <Sheet open={sheet?.kind === "addKr"} onClose={close} title="نتيجة رئيسية جديدة">
        <p className="mb-4 text-[15px] text-muted">رقم بيتغيّر، مش مهمة بتخلص. «كم مستخدم؟» مش «اعمل صفحة». (Measure What Matters)</p>
        <MetricForm submitLabel="أضف النتيجة" onSubmit={async (m) => { const r = await A.addKr(okr.id, m); if (r.ok) close(); return r; }} />
      </Sheet>
      <Sheet open={sheet?.kind === "edit"} onClose={close} title="عدّل الأولوية">
        <EditOkr okr={okr} sgs={sgs} onDone={close} />
      </Sheet>
    </article>
  );
}

function CheckIn({ kr, onDone, onEdit }: { kr: MetricView; onDone: () => void; onEdit: () => void }) {
  const [v, setV] = useState(String(kr.latest ?? kr.start ?? ""));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const step = kr.target != null && kr.start != null && Math.abs(kr.target - kr.start) >= 50 ? 10 : 1;
  const n = Number(v.replace(",", "."));
  const bump = (d: number) => setV(String(Math.round(((Number.isFinite(n) ? n : 0) + d) * 100) / 100));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim() === "" || !Number.isFinite(n)) return setError("اكتب رقم");
        start(async () => {
          const r = await A.checkIn(kr.id, n);
          if (r.ok) {
            if ("vibrate" in navigator) navigator.vibrate?.(10);
            onDone();
          } else setError(r.message);
        });
      }}
    >
      <p className="mb-3 text-[15px] text-muted">
        الهدف: من <bdi className="tnum">{fmt(kr.start)}</bdi> لـ <bdi className="tnum">{fmt(kr.target)}</bdi> {kr.unit}
        {kr.latestDate && <> · آخر تسجيل <bdi className="tnum">{kr.latestDate}</bdi></>}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn h-14 w-14 shrink-0 text-2xl" onClick={() => bump(-step)} aria-label={`ناقص ${step}`}>−</button>
        <input inputMode="decimal" dir="ltr" className="tnum h-14 text-center text-[28px] font-extrabold" value={v} onChange={(e) => setV(e.target.value)} aria-label="القيمة الحالية" />
        <button type="button" className="btn h-14 w-14 shrink-0 text-2xl" onClick={() => bump(step)} aria-label={`زايد ${step}`}>+</button>
      </div>
      {error && <p className="mt-2 text-[15px] text-danger">{error}</p>}
      <button className="btn btn-primary mt-4 w-full" aria-busy={pending}>{pending ? "عم يسجّل…" : "سجّل الرقم"}</button>
      <button type="button" className="btn btn-text mt-1 w-full" onClick={onEdit}>عدّل البداية أو الهدف</button>
    </form>
  );
}

function EditOkr({ okr, sgs, onDone }: { okr: Okr; sgs: Sg[]; onDone: () => void }) {
  const [title, setTitle] = useState(okr.title);
  const [type, setType] = useState<OkrType>(okr.type);
  const [sg, setSg] = useState(okr.strategicGoalId ?? "");
  const [hours, setHours] = useState(okr.weeklyHours?.toString() ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const h = hours.trim() === "" ? null : Number(hours);
        start(async () => {
          const r = await A.editOkr(okr.id, { title, okrType: type, strategicGoalId: sg || null, weeklyHours: h });
          if (r.ok) onDone();
          else setError(r.message);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">الهدف (Objective)</span>
        <textarea rows={2} value={title} onChange={(e) => setTitle(e.target.value)} />
        <span className="text-[13px] text-muted">ملهم وواضح، بدون أرقام. الأرقام بالنتائج.</span>
      </label>
      <div>
        <span className="mb-1 block text-[15px] font-bold">النوع</span>
        <div className="grid grid-cols-2 gap-2">
          {(["COMMITTED", "ASPIRATIONAL"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t} className={`btn flex-col !items-start py-2 text-start ${type === t ? "btn-secondary ring-2 ring-accent" : ""}`}>
              <span>{OKR_TYPE_LABEL[t]}</span>
              <span className="text-[13px] font-medium text-muted">{t === "COMMITTED" ? "لازم 100%" : "0.7 يعتبر نجاح"}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">بيخدم أي هدف استراتيجي؟</span>
        <select value={sg} onChange={(e) => setSg(e.target.value)}>
          <option value="">— مش مربوط —</option>
          {sgs.map((s) => (
            <option key={s.id} value={s.id}>{PERSPECTIVE_LABEL[s.perspective]}: {s.title}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">كم ساعة بالأسبوع بتحتاج؟</span>
        <input inputMode="decimal" dir="ltr" className="tnum" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="مثلاً 6" />
        <span className="text-[13px] text-muted">التطبيق بيضيف هامش 50% وبيقارن مع ساعاتك الحرة (Essentialism)</span>
      </label>
      {error && <p className="text-[15px] text-danger">{error}</p>}
      <button className="btn btn-primary w-full" aria-busy={pending}>احفظ</button>
      <button
        type="button"
        className="btn btn-danger w-full"
        onClick={() => start(async () => { await A.demote(okr.id); onDone(); })}
      >
        نزّلها لهدف صيانة
      </button>
    </form>
  );
}
