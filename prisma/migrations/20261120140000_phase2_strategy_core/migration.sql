-- CreateEnum
CREATE TYPE "Perspective" AS ENUM ('FINANCE', 'IMPACT', 'SYSTEM', 'GROWTH');

-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('OKR', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "OkrType" AS ENUM ('COMMITTED', 'ASPIRATIONAL');

-- CreateEnum
CREATE TYPE "MetricRole" AS ENUM ('LEADING', 'LAGGING');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "kind" "GoalKind" NOT NULL DEFAULT 'MAINTENANCE',
ADD COLUMN     "okrType" "OkrType",
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "strategicGoalId" TEXT,
ADD COLUMN     "weeklyHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Pillar" ADD COLUMN     "perspective" "Perspective";

-- CreateTable
CREATE TABLE "StrategyKernel" (
    "cycleId" TEXT NOT NULL,
    "coreChallenge" TEXT,
    "guidingPolicy" TEXT,
    "guidingPolicyNot" TEXT,
    "essentialIntent" TEXT,
    "freeHours" DOUBLE PRECISION,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyKernel_pkey" PRIMARY KEY ("cycleId")
);

-- CreateTable
CREATE TABLE "StrategicGoal" (
    "id" TEXT NOT NULL,
    "perspective" "Perspective" NOT NULL,
    "title" TEXT NOT NULL,
    "horizonEnd" DATE NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotDoing" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "pillarId" TEXT,
    "text" TEXT NOT NULL,
    "reason" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotDoing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "start" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "direction" "KpiDirection" NOT NULL,
    "role" "MetricRole" NOT NULL DEFAULT 'LAGGING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "goalId" TEXT,
    "strategicGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricReading" (
    "metricId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricReading_pkey" PRIMARY KEY ("metricId","date")
);

-- CreateIndex
CREATE INDEX "Metric_goalId_idx" ON "Metric"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_cycleId_rank_key" ON "Goal"("cycleId", "rank");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_strategicGoalId_fkey" FOREIGN KEY ("strategicGoalId") REFERENCES "StrategicGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyKernel" ADD CONSTRAINT "StrategyKernel_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotDoing" ADD CONSTRAINT "NotDoing_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotDoing" ADD CONSTRAINT "NotDoing_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_strategicGoalId_fkey" FOREIGN KEY ("strategicGoalId") REFERENCES "StrategicGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricReading" ADD CONSTRAINT "MetricReading_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===== قيود المجال بقاعدة البيانات (ADR-005، DDIA: حوّل التعارض لشي ملموس) =====
ALTER TABLE "Goal" ADD CONSTRAINT okr_rank_range CHECK ("rank" IS NULL OR "rank" BETWEEN 1 AND 3);
ALTER TABLE "Goal" ADD CONSTRAINT okr_has_rank CHECK (("kind" = 'OKR') = ("rank" IS NOT NULL));
ALTER TABLE "Goal" ADD CONSTRAINT okr_has_type CHECK ("kind" <> 'OKR' OR "okrType" IS NOT NULL);
ALTER TABLE "Goal" ADD CONSTRAINT goal_weight_range CHECK ("weight" BETWEEN 1 AND 5);
ALTER TABLE "Goal" ADD CONSTRAINT goal_hours_positive CHECK ("weeklyHours" IS NULL OR "weeklyHours" >= 0);
ALTER TABLE "Metric" ADD CONSTRAINT metric_one_owner CHECK (num_nonnulls("goalId", "strategicGoalId") <= 1);
ALTER TABLE "StrategyKernel" ADD CONSTRAINT challenge_one_sentence CHECK ("coreChallenge" IS NULL OR char_length("coreChallenge") <= 200);
ALTER TABLE "StrategyKernel" ADD CONSTRAINT free_hours_range CHECK ("freeHours" IS NULL OR "freeHours" BETWEEN 0 AND 168);
ALTER TABLE "WeeklyTask" ADD CONSTRAINT task_progress_range CHECK ("progress" IS NULL OR "progress" BETWEEN 0 AND 100);

-- ===== «وسّع» (Expand/Contract): انسخ المؤشرات القديمة لكيان Metric =====
-- الحقول القديمة Goal.kpi* وجدول KpiReading بيضلّوا لحد خطوة «قلّص» (ADR-003)
INSERT INTO "Metric" ("id", "name", "unit", "start", "target", "direction", "goalId")
SELECT 'm_' || "id", "kpiName", "kpiUnit", "kpiStart", "kpiTarget", COALESCE("kpiDirection", 'UP'), "id"
FROM "Goal" WHERE "kpiName" IS NOT NULL;

INSERT INTO "MetricReading" ("metricId", "date", "value", "note", "createdAt")
SELECT 'm_' || r."goalId", r."weekStart", r."value", r."note", r."createdAt"
FROM "KpiReading" r JOIN "Goal" g ON g."id" = r."goalId" WHERE g."kpiName" IS NOT NULL;
