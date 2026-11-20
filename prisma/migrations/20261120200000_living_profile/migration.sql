-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "profileLearnedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProfileFact" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "key" TEXT,
    "text" TEXT NOT NULL,
    "evidence" TEXT,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "note" TEXT,
    "lastContact" DATE,
    "source" TEXT NOT NULL DEFAULT 'ME',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileFact_key_key" ON "ProfileFact"("key");

-- CreateIndex
CREATE INDEX "ProfileFact_area_idx" ON "ProfileFact"("area");


-- قيود المجال بالقاعدة كمان (ADR: الثوابت بمكانين)
ALTER TABLE "ProfileFact" ADD CONSTRAINT "profilefact_area_values" CHECK ("area" IN ('VALUES','ENERGY','HABITS','PROCRASTINATION','TRIGGERS','MONEY','STRENGTHS','PREFERENCES'));
ALTER TABLE "ProfileFact" ADD CONSTRAINT "profilefact_source_values" CHECK ("source" IN ('DATA','CLAUDE','ME'));
ALTER TABLE "ProfileFact" ADD CONSTRAINT "profilefact_status_values" CHECK ("status" IN ('NEW','CONFIRMED','REJECTED'));
ALTER TABLE "ProfileFact" ADD CONSTRAINT "profilefact_confidence_range" CHECK ("confidence" >= 0 AND "confidence" <= 1);
ALTER TABLE "Person" ADD CONSTRAINT "person_source_values" CHECK ("source" IN ('ME','CLAUDE'));
