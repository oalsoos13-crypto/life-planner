import { BottomNav } from "./BottomNav";

/** قالب «تطبيق يومي» (Atomic Design): رأس صغير + محتوى + تنقل سفلي */
export function Shell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-safe">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
