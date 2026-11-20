import type { Metadata, Viewport } from "next";
import { Amiri, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18n";
import { SwRegister } from "@/components/SwRegister";

// خط النص بثلاث أوزان، وخط العناوين الكلاسيكي (دليل الواجهات §4.1)
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const amiri = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], variable: "--font-amiri" });

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
    { media: "(prefers-color-scheme: light)", color: "#f4f2ff" },
    { media: "(prefers-color-scheme: dark)", color: "#05061a" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings().catch(() => null);
  const locale = s?.locale ?? "ar";
  const theme = s?.theme ?? "dark";
  const tz = s?.timezone ?? "Asia/Kuwait";
  const t = getDict(locale);
  // «حسب الوقت»: عاج بالنهار، مخمل وذهب من المغرب للفجر تقريباً (6م - 6ص بتوقيتك)
  const themeScript = `(function(){var t=${JSON.stringify(theme)};var h=+new Intl.DateTimeFormat('en-GB',{hour:'numeric',hourCycle:'h23',timeZone:${JSON.stringify(tz)}}).format(new Date());var d=t==='dark'||(t==='time'&&(h>=18||h<6))||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')})()`;
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${plex.variable} ${amiri.variable}`} suppressHydrationWarning>
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
