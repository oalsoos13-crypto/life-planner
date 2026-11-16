import { RestoreButton } from "@/components/RestoreButton";
import { Shell } from "@/components/Shell";
import { SettingsForm } from "@/components/SettingsForm";
import { getDict } from "@/lib/i18n";
import { getContext } from "@/lib/week";
import { logout } from "../actions";

export default async function SettingsPage() {
  const { settings } = await getContext();
  const t = getDict(settings.locale);
  return (
    <Shell title={t.settings}>
      <div className="space-y-4">
        <SettingsForm weekStartDay={settings.weekStartDay} locale={settings.locale} theme={settings.theme} />
        <section className="card space-y-3 p-4">
          <h2 className="font-bold">{t.export}</h2>
          <a href="/api/export/json" className="btn w-full">⬇ {t.exportJson}</a>
          <a href="/api/export/excel" className="btn w-full">⬇ {t.exportExcel}</a>
          <RestoreNote locale={settings.locale} />
        </section>
        <p className="text-center text-xs text-muted">{t.install}</p>
        <form action={logout}>
          <button className="btn w-full text-red-600">{t.logout}</button>
        </form>
        <p className="text-center text-xs text-muted">{t.phaseNote}</p>
      </div>
    </Shell>
  );
}

function RestoreNote({ locale }: { locale: string }) {
  return <RestoreButton label={locale === "ar" ? "⬆ استرجاع من نسخة احتياطية (JSON)" : "⬆ Restore from backup (JSON)"} confirmText={locale === "ar" ? "الاسترجاع رح يمسح كل البيانات الحالية ويحط محلها النسخة. متأكد؟" : "This replaces ALL current data with the backup. Continue?"} />;
}
