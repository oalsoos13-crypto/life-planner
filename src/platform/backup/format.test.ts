import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { dependencyOrder, parseBackup, sanitizeRows, selfRefFields, upgradeV1, type ModelInfo } from "./format";

const models = Prisma.dmmf.datamodel.models as unknown as ModelInfo[];

describe("dependencyOrder (من نماذج Prisma الحقيقية)", () => {
  const order = dependencyOrder(models);
  it("بيغطّي كل الجداول: ما في جدول بينسى (دالة لياقة)", () => {
    expect(new Set(order)).toEqual(new Set(models.map((m) => m.name)));
  });
  it("الأب قبل الابن", () => {
    const at = (n: string) => order.indexOf(n);
    expect(at("Cycle")).toBeLessThan(at("Goal"));
    expect(at("Goal")).toBeLessThan(at("Metric"));
    expect(at("Metric")).toBeLessThan(at("MetricReading"));
    expect(at("StrategicGoal")).toBeLessThan(at("Goal"));
  });
  it("بيعرف المهمة المنقولة كعلاقة ذاتية", () => {
    expect(selfRefFields(models.find((m) => m.name === "WeeklyTask")!)).toEqual(["carriedFromId"]);
  });
});

describe("upgradeV1", () => {
  const v1 = {
    app: "life-planner",
    version: 1,
    exportedAt: "2026-11-20T00:00:00Z",
    goals: [{ id: "g1", kpiName: "الوزن", kpiUnit: "كغ", kpiStart: 90, kpiTarget: 85, kpiDirection: "DOWN" }, { id: "g2" }],
    kpiReadings: [{ id: "r", goalId: "g1", weekStart: "2026-11-22", value: 89 }],
    weeklyTasks: [{ id: "t" }],
  };
  it("بينقل المؤشرات لكيان Metric بدون ما يضيّع ولا قراءة", () => {
    const v2 = upgradeV1(v1);
    expect(v2.version).toBe(2);
    expect(v2.tables.Metric).toEqual([{ id: "m_g1", name: "الوزن", unit: "كغ", start: 90, target: 85, direction: "DOWN", goalId: "g1" }]);
    expect(v2.tables.MetricReading).toEqual([{ metricId: "m_g1", date: "2026-11-22", value: 89, note: null }]);
    expect(v2.tables.WeeklyTask).toHaveLength(1);
    expect(v2.tables.Goal).toHaveLength(2);
  });
  it("parseBackup بيرقّي لحاله وبيرفض الغريب والأحدث", () => {
    expect(parseBackup(v1).version).toBe(2);
    expect(() => parseBackup({ app: "x" })).toThrow();
    expect(() => parseBackup({ app: "life-planner", version: 99 })).toThrow();
  });
});

describe("sanitizeRows (استيراد مرن)", () => {
  it("بيشيل الحقول الغريبة والـ Json الفاضي", () => {
    const m = models.find((x) => x.name === "WeekReview")!;
    expect(sanitizeRows(m, [{ weekStart: "2026-11-15", learned: "x", top3: null, oldField: 1 }])).toEqual([{ weekStart: "2026-11-15", learned: "x" }]);
  });
});
