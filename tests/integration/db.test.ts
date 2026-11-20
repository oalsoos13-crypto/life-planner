// اختبارات تكامل على PostgreSQL حقيقي (ADR-010). بتشتغل بس إذا في TEST_DATABASE_URL
// (بالـ CI: حاوية Postgres؛ محلياً: قاعدة تجربة). ما بتلمس قاعدتك الحقيقية أبداً.
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

describe.skipIf(!url)("تكامل: القيود، OKRs، النسخ الاحتياطي", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let uc: typeof import("@/modules/strategy/application/useCases");
  let backup: typeof import("@/lib/backup");

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db"));
    uc = await import("@/modules/strategy/application/useCases");
    backup = await import("@/lib/backup");
    // قاعدة تجربة نظيفة بخطة عمر الحقيقية. حماية: اسم القاعدة لازم فيه "test"
    if (!/test/i.test(new URL(url!).pathname)) throw new Error("TEST_DATABASE_URL لازم يكون قاعدة تجربة");
    await prisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await prisma.$executeRawUnsafe("CREATE SCHEMA public");
    const { execSync } = await import("node:child_process");
    const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
    execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
    execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
  }, 180000);

  it("الخطة انحمّلت مع مسودة الاستراتيجية: 3 OKRs و5 أهداف استراتيجية", async () => {
    expect(await prisma.goal.count({ where: { kind: "OKR" } })).toBe(3);
    expect(await prisma.strategicGoal.count()).toBe(5);
    expect(await prisma.notDoing.count()).toBeGreaterThan(0);
  });

  it("الرابع مرفوض من المجال بلغة المنهجية", async () => {
    const g = await prisma.goal.findFirstOrThrow({ where: { kind: "MAINTENANCE" } });
    const r = await uc.promoteToOkr({ goalId: g.id, type: "COMMITTED" });
    expect(r.ok).toBe(false);
  });

  it("وحتى لو حدا تجاوز الكود، قاعدة البيانات بترفض (CHECK + UNIQUE)", async () => {
    const g = await prisma.goal.findFirstOrThrow({ where: { kind: "MAINTENANCE" } });
    await expect(prisma.goal.update({ where: { id: g.id }, data: { kind: "OKR", rank: 4, okrType: "COMMITTED" } })).rejects.toThrow();
    await expect(prisma.goal.update({ where: { id: g.id }, data: { kind: "OKR", rank: 1, okrType: "COMMITTED" } })).rejects.toThrow();
    await expect(prisma.goal.update({ where: { id: g.id }, data: { kind: "OKR" } })).rejects.toThrow();
  });

  it("بعد ما تنزّل وحدة، بتقدر ترقّي غيرها على نفس الرتبة", async () => {
    const o = await prisma.goal.findFirstOrThrow({ where: { kind: "OKR", rank: 3 } });
    await uc.demoteOkr(o.id);
    const g = await prisma.goal.findFirstOrThrow({ where: { kind: "MAINTENANCE", id: { not: o.id } } });
    expect(await uc.promoteToOkr({ goalId: g.id, type: "ASPIRATIONAL" })).toEqual({ ok: true, value: 3 });
    await uc.demoteOkr(g.id);
    expect((await uc.promoteToOkr({ goalId: o.id, type: "ASPIRATIONAL" })).ok).toBe(true);
  });

  it("النتائج الرئيسية حدها 5", async () => {
    const o = await prisma.goal.findFirstOrThrow({ where: { kind: "OKR", rank: 1 } });
    const n = await prisma.metric.count({ where: { goalId: o.id } });
    for (let i = n; i < 5; i++) expect((await uc.addKeyResult(o.id, { name: `KR${i}`, target: 10, start: 0, direction: "UP" })).ok).toBe(true);
    expect((await uc.addKeyResult(o.id, { name: "KR6", target: 10, start: 0, direction: "UP" })).ok).toBe(false);
  });

  it("التحدي أطول من جملة مرفوض بالقاعدة كمان", async () => {
    const k = await prisma.strategyKernel.findFirstOrThrow();
    await expect(prisma.strategyKernel.update({ where: { cycleId: k.cycleId }, data: { coreChallenge: "أ".repeat(201) } })).rejects.toThrow();
  });

  it("صدّر ← استرجع ← صدّر = نفس الشي (دالة لياقة)", async () => {
    const a = await backup.dumpAll();
    await backup.restoreAll(JSON.parse(JSON.stringify(a)));
    const b = await backup.dumpAll();
    const strip = (x: typeof a) => JSON.stringify({ ...x, exportedAt: 0 });
    expect(strip(b)).toBe(strip(a));
    expect(Object.values(a.tables).reduce((n, r) => n + r.length, 0)).toBeGreaterThan(50);
  }, 60000);
});
