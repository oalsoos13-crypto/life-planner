import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18n";
import { SwRegister } from "@/components/SwRegister";

const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], variable: "--font-tajawal" });

export const metadata: Metadata = {
  title: "خطتي",
  description: "تخطيط الحياة والتقرير الأسبوعي",
  appleWebApp: { capable: true, title: "خطتي", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#111614" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings().catch(() => null);
  const locale = s?.locale ?? "ar";
  const theme = s?.theme ?? "system";
  const t = getDict(locale);
  const themeScript = `(function(){var t=${JSON.stringify(theme)};var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')})()`;
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={tajawal.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased min-h-dvh">
        <I18nProvider t={t} locale={locale}>
          {children}
        </I18nProvider>
        <SwRegister />
      </body>
    </html>
  );
}
