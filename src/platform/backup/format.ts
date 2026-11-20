// صيغة النسخة الاحتياطية بإصدارات + دوال ترقية + استيراد مرن (ADR-008)
// نقي: ما بيعرف Prisma؛ بياخد وصف النماذج كبيانات (DDIA: تطوّر الصيغة؛ Hard Parts: العقود المرنة)
export const BACKUP_VERSION = 2;

export type Row = Record<string, unknown>;
export type BackupV2 = { app: "life-planner"; version: 2; exportedAt: string; tables: Record<string, Row[]> };

export type ModelInfo = {
  name: string;
  fields: { name: string; kind: string; type: string; relationFromFields?: readonly string[]; isList?: boolean }[];
};

const V1_KEYS: Record<string, string> = {
  settings: "Settings",
  cycles: "Cycle",
  pillars: "Pillar",
  goals: "Goal",
  kpiReadings: "KpiReading",
  goalSupports: "GoalSupport",
  planTasks: "PlanTask",
  planSubtasks: "PlanSubtask",
  planSteps: "PlanStep",
  recurrences: "Recurrence",
  weeklyTasks: "WeeklyTask",
  weeklyTaskSteps: "WeeklyTaskStep",
  weekReviews: "WeekReview",
  notifications: "Notification",
};

/** v1 (المرحلة 1) ← v2: أسماء الجداول + المؤشرات بكيان Metric */
export function upgradeV1(d: Row): BackupV2 {
  const tables: Record<string, Row[]> = {};
  for (const [k, model] of Object.entries(V1_KEYS)) tables[model] = (d[k] as Row[] | undefined) ?? [];
  const goals = tables.Goal;
  tables.Metric = goals
    .filter((g) => g.kpiName)
    .map((g) => ({ id: "m_" + g.id, name: g.kpiName, unit: g.kpiUnit ?? null, start: g.kpiStart ?? null, target: g.kpiTarget ?? null, direction: g.kpiDirection ?? "UP", goalId: g.id }));
  const withKpi = new Set(tables.Metric.map((m) => m.goalId));
  tables.MetricReading = tables.KpiReading.filter((r) => withKpi.has(r.goalId)).map((r) => ({
    metricId: "m_" + r.goalId,
    date: r.weekStart,
    value: r.value,
    note: r.note ?? null,
  }));
  return { app: "life-planner", version: 2, exportedAt: String(d.exportedAt ?? new Date().toISOString()), tables };
}

const UPGRADES: Record<number, (d: Row) => BackupV2> = { 1: upgradeV1 };

export function parseBackup(d: unknown): BackupV2 {
  if (!d || typeof d !== "object" || (d as Row).app !== "life-planner") throw new Error("ملف مش صحيح");
  const v = Number((d as Row).version ?? 1);
  if (v === BACKUP_VERSION) return d as BackupV2;
  if (v > BACKUP_VERSION) throw new Error("الملف من نسخة أحدث من التطبيق");
  const up = UPGRADES[v];
  if (!up) throw new Error(`ما بعرف أرقّي نسخة ${v}`);
  return up(d as Row);
}

/** ترتيب النماذج حسب الاعتماد (الأب قبل الابن)، والعلاقات الذاتية بتتعالج لحالها */
export function dependencyOrder(models: ModelInfo[]): string[] {
  const deps = new Map<string, Set<string>>();
  for (const m of models) {
    const d = new Set<string>();
    for (const f of m.fields) if (f.kind === "object" && f.relationFromFields?.length && f.type !== m.name) d.add(f.type);
    deps.set(m.name, d);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of deps.get(n) ?? []) visit(d);
    out.push(n);
  };
  for (const m of models) visit(m.name);
  return out;
}

/** الحقول الي بتشير لنفس الجدول (مثلاً المهمة المنقولة من مهمة) */
export function selfRefFields(m: ModelInfo): string[] {
  return m.fields.filter((f) => f.kind === "object" && f.type === m.name && f.relationFromFields?.length).flatMap((f) => [...f.relationFromFields!]);
}

/** استيراد مرن: بنشيل أي حقل مش معروف بالنموذج الحالي، والـ Json الفاضي بيصير undefined */
export function sanitizeRows(m: ModelInfo, rows: Row[]): Row[] {
  const scalar = new Map(m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => [f.name, f.type]));
  return rows.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) {
      if (!scalar.has(k)) continue;
      if (scalar.get(k) === "Json" && v == null) continue;
      o[k] = v;
    }
    return o;
  });
}
