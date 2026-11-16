import { BottomNav } from "./BottomNav";

export function Shell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-safe">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {action}
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
