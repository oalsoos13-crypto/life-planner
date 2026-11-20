-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "dayBlocks" JSONB,
ALTER COLUMN "theme" SET DEFAULT 'time';

-- CreateTable
CREATE TABLE "DayLog" (
    "date" DATE NOT NULL,
    "intent" TEXT,
    "energy" INTEGER,
    "mood" INTEGER,
    "evening" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayLog_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Circle',
    "pillarId" TEXT,
    "metricId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCheck" (
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitCheck_pkey" PRIMARY KEY ("habitId","date")
);

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCheck" ADD CONSTRAINT "HabitCheck_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- قيود المجال بقاعدة البيانات كمان (دليل الهندسة §4)
ALTER TABLE "DayLog" ADD CONSTRAINT "daylog_energy_range" CHECK ("energy" IS NULL OR "energy" BETWEEN 1 AND 5);
ALTER TABLE "DayLog" ADD CONSTRAINT "daylog_mood_range" CHECK ("mood" IS NULL OR "mood" BETWEEN 1 AND 5);
ALTER TABLE "Settings" ADD CONSTRAINT "settings_theme_values" CHECK ("theme" IN ('time', 'system', 'light', 'dark'));

-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'TEXT',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Capture_processedAt_idx" ON "Capture"("processedAt");
