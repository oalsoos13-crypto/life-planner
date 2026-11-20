import { BottomNav } from "./BottomNav";

/**
 * قالب الشاشة (Atomic Design): خلفية الهوية فوق (رخام بالنهار، مخمل بالليل) + عنوان بخط Amiri + تنقل عائم.
 * eyebrow: سطر صغير فوق العنوان (التاريخ مثلاً).
 */
export function Shell({
  title,
  subtitle,
  eyebrow,
  action,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px]" style={{ background: "var(--hero-bg)" }} />
      <div className="relative mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-safe">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="mb-2 text-[13px] text-muted">{eyebrow}</p>}
            <h1 className="font-display text-[34px] font-bold leading-[1.2] text-accent dark:text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
