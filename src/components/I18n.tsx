"use client";
import { createContext, useContext } from "react";
import type { Dict } from "@/lib/i18n";

const Ctx = createContext<{ t: Dict; locale: string } | null>(null);

export function I18nProvider({ t, locale, children }: { t: Dict; locale: string; children: React.ReactNode }) {
  return <Ctx.Provider value={{ t, locale }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("I18nProvider missing");
  return v;
}
