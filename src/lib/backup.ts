// النسخ الاحتياطي v2: قائمة الجداول بتطلع لحالها من نماذج Prisma، فجدول جديد ما بينسى (ADR-008)
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { BACKUP_VERSION, dependencyOrder, parseBackup, sanitizeRows, selfRefFields, type BackupV2, type ModelInfo, type Row } from "@/platform/backup/format";

const models = Prisma.dmmf.datamodel.models as unknown as ModelInfo[];
const byName = new Map(models.map((m) => [m.name, m]));
const ORDER = dependencyOrder(models);

type Delegate = {
  findMany: (a?: object) => Promise<Row[]>;
  createMany: (a: { data: Row[] }) => Promise<unknown>;
  deleteMany: () => Promise<unknown>;
  update: (a: { where: Row; data: Row }) => Promise<unknown>;
};
const delegate = (client: object, model: string) => (client as Record<string, Delegate>)[model[0].toLowerCase() + model.slice(1)];

export async function dumpAll(): Promise<BackupV2> {
  const tables: Record<string, Row[]> = {};
  for (const m of ORDER) tables[m] = await delegate(prisma, m).findMany();
  return { app: "life-planner", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export async function restoreAll(input: unknown) {
  const d = parseBackup(input);
  await prisma.$transaction(
    async (tx) => {
      // الابن قبل الأب بالحذف، والأب قبل الابن بالإضافة
      for (const m of [...ORDER].reverse()) await delegate(tx, m).deleteMany();
      for (const m of ORDER) {
        const info = byName.get(m)!;
        const self = selfRefFields(info);
        const rows = sanitizeRows(info, d.tables[m] ?? []);
        // العلاقات الذاتية: منحطّ الصفوف بدون الربط، وبعدين منرجّعه
        await delegate(tx, m).createMany({ data: rows.map((r) => (self.length ? { ...r, ...Object.fromEntries(self.map((f) => [f, null])) } : r)) });
        for (const f of self)
          for (const r of rows.filter((r) => r[f] != null)) await delegate(tx, m).update({ where: { id: r.id }, data: { [f]: r[f] } });
      }
    },
    { timeout: 120000 }
  );
}
