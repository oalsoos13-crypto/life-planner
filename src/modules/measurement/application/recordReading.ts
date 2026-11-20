// تسجيل قراءة مؤشر: قراءة وحدة لكل تاريخ، تعديل بدل تكرار (ADR-007)
import "server-only";
import { prisma } from "@/shared/db";
import { err, ok, type Result } from "@/shared/kernel/result";
import { isValidYmd, toDate, type Ymd } from "@/shared/kernel/dates";

export async function recordReading(metricId: string, date: Ymd, value: number, note?: string): Promise<Result<void>> {
  if (!isValidYmd(date)) return err("DATE", "تاريخ مش صحيح");
  if (!Number.isFinite(value)) return err("VALUE", "اكتب رقم");
  await prisma.metricReading.upsert({
    where: { metricId_date: { metricId, date: toDate(date) } },
    update: { value, note: note?.trim() || null },
    create: { metricId, date: toDate(date), value, note: note?.trim() || null },
  });
  return ok(undefined);
}
