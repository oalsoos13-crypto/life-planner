"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18n";

const items = [
  { href: "/", key: "home", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/week", key: "week", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/strategy", key: "strategy", icon: "M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" },
  { href: "/settings", key: "settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm8-3l2-1-2-4-2 1a7 7 0 00-2-1l-.5-2h-4L11 7a7 7 0 00-2 1L7 7l-2 4 2 1a7 7 0 000 2l-2 1 2 4 2-1a7 7 0 002 1l.5 2h4l.5-2a7 7 0 002-1l2 1 2-4-2-1a7 7 0 000-2z" },
] as const;

export function BottomNav() {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-line bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto max-w-xl grid grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={`flex flex-col items-center gap-1 py-2.5 text-xs ${active ? "text-accent font-bold" : "text-muted"}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
              {t[it.key]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
