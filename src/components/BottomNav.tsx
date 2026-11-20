"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./ui/Icon";
import { CaptureSheet } from "./today/CaptureSheet";

const items = [
  { href: "/", label: "اليوم", icon: "Sun" },
  { href: "/week", label: "الأسبوع", icon: "CalendarRange" },
  null, // زر الالتقاط بالنص، تحت الإبهام (Fitts)
  { href: "/strategy", label: "الاستراتيجية", icon: "Compass" },
  { href: "/settings", label: "الإعدادات", icon: "Settings2" },
] as const;

/** تنقل عائم بخمس أماكن وزر مايك بالنص (مخطط المنتج: الالتقاط من أي شاشة) */
export function BottomNav() {
  const path = usePathname();
  const [capturing, setCapturing] = useState(false);
  return (
    <>
      <nav
        className="fixed inset-x-3 z-30 mx-auto max-w-lg rounded-[28px] border border-line bg-card/90 shadow-[var(--shadow-lg)] backdrop-blur-xl dark:border-[rgb(185_200_255/0.22)] dark:bg-[rgb(16_14_50/0.78)]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        aria-label="التنقل"
      >
        <div className="grid h-[72px] grid-cols-5 items-center">
          {items.map((it) =>
            it === null ? (
              <div key="mic" className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setCapturing(true)}
                  aria-label="احكي أو اكتب: التقاط سريع"
                  className="orb -mt-9 flex h-[66px] w-[66px] items-center justify-center rounded-full shadow-[0_0_0_6px_var(--color-bg),0_0_40px_var(--glow)] transition active:scale-95"
                >
                  <Icon name="Mic" size={28} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <NavLink key={it.href} {...it} active={it.href === "/" ? path === "/" : path.startsWith(it.href)} />
            ),
          )}
        </div>
      </nav>
      <CaptureSheet open={capturing} onClose={() => setCapturing(false)} />
    </>
  );
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-bold text-accent dark:text-[#b9f3ff]" : "text-muted"}`}>
      <Icon name={icon} size={23} strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}
