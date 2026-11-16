"use client";
import { useTransition } from "react";
import { updateSettings } from "@/app/actions";
import { useI18n } from "./I18n";

export function SettingsForm({ weekStartDay, locale, theme }: { weekStartDay: number; locale: string; theme: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const set = (d: Parameters<typeof updateSettings>[0]) =>
    start(async () => {
      await updateSettings(d);
      if (d.theme || d.locale) location.reload();
    });
  return (
    <section className="card space-y-4 p-4">
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">{t.weekStartDay}</span>
        <select defaultValue={weekStartDay} disabled={pending} onChange={(e) => set({ weekStartDay: Number(e.target.value) })}>
          {t.days.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">{t.language}</span>
        <select defaultValue={locale} disabled={pending} onChange={(e) => set({ locale: e.target.value })}>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </label>
      <div className="space-y-1.5">
        <span className="text-sm text-muted">{t.theme}</span>
        <div className="grid grid-cols-3 gap-2">
          {(["system", "light", "dark"] as const).map((th) => (
            <button key={th} type="button" disabled={pending} onClick={() => set({ theme: th })} className={`btn ${theme === th ? "btn-primary" : ""}`}>
              {th === "system" ? t.themeSystem : th === "light" ? t.themeLight : t.themeDark}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
