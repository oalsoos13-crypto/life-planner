import { BottomNav } from "./BottomNav";

/**
 * قالب الشاشة (Atomic Design) بهوية «فضاء ونجوم»: سما بنجوم ثابتة ورا كل شي، ورسمة فوق (كوكب مثلاً)،
 * وعنوان بخط Amiri، وتنقّل عائم.
 * art: رسمة الزاوية الفوقانية (بتطلع شوي برا الشاشة عن قصد).
 */
export function Shell({
  title,
  subtitle,
  eyebrow,
  action,
  art,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  art?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="space-bg" />
      {art && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[340px] overflow-hidden">
          <div className="absolute top-0 left-0 opacity-95">{art}</div>
        </div>
      )}
      <div className={`relative mx-auto max-w-xl px-4 pb-safe ${art ? "pt-[calc(env(safe-area-inset-top)+1.25rem)]" : "pt-[calc(env(safe-area-inset-top)+1.25rem)]"}`}>
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <div className="mb-2 text-[13px] text-muted">{eyebrow}</div>}
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
