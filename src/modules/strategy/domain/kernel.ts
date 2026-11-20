// نواة الاستراتيجية (Rumelt: Good Strategy Bad Strategy): تشخيص ← سياسة موجّهة ← أفعال متماسكة
import { err, ok, type Result } from "@/shared/kernel/result";

export const CHALLENGE_MAX = 200; // جملة وحدة إجبارية

export type Kernel = {
  coreChallenge: string | null;
  guidingPolicy: string | null;
  guidingPolicyNot: string | null;
  essentialIntent: string | null;
  freeHours: number | null;
};

export function validateChallenge(text: string): Result<string> {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return err("CHALLENGE_EMPTY", "التحدي الأساسي إجباري: بدونه الخطة قائمة أمنيات.");
  if (t.length > CHALLENGE_MAX) return err("CHALLENGE_LONG", `خليه جملة وحدة (${t.length}/${CHALLENGE_MAX} حرف).`);
  return ok(t);
}

export const clean = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  return t ? t : null;
};
