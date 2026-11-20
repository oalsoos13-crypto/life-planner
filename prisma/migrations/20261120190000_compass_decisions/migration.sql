-- CreateTable
CREATE TABLE "Compass" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bhag" TEXT,
    "picture3y" TEXT,
    "mission" TEXT,
    "winning" TEXT,
    "why" TEXT,
    "eulogy" TEXT,
    "enough" DOUBLE PRECISION,
    "enoughNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompassItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "detail" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompassItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelScore" (
    "date" DATE NOT NULL,
    "pillarId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "WheelScore_pkey" PRIMARY KEY ("date","pillarId")
);

-- CreateTable
CREATE TABLE "SwotItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwotItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT,
    "options" JSONB NOT NULL,
    "chosen" TEXT,
    "why" TEXT,
    "premortem" TEXT,
    "outsideView" TEXT,
    "biases" JSONB,
    "reviewAt" DATE,
    "outcome" TEXT,
    "lesson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompassItem_kind_idx" ON "CompassItem"("kind");

-- CreateIndex
CREATE INDEX "Decision_status_idx" ON "Decision"("status");

-- AddForeignKey
ALTER TABLE "WheelScore" ADD CONSTRAINT "WheelScore_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- قيود (DDIA)
ALTER TABLE "Compass" ADD CONSTRAINT "compass_singleton" CHECK ("id" = 1);
ALTER TABLE "CompassItem" ADD CONSTRAINT "compassitem_kind_values" CHECK ("kind" IN ('VALUE','PRINCIPLE','IDENTITY'));
ALTER TABLE "WheelScore" ADD CONSTRAINT "wheel_score_range" CHECK ("score" BETWEEN 0 AND 10);
ALTER TABLE "SwotItem" ADD CONSTRAINT "swot_kind_values" CHECK ("kind" IN ('S','W','O','T'));
ALTER TABLE "Decision" ADD CONSTRAINT "decision_status_values" CHECK ("status" IN ('OPEN','DECIDED','REVIEWED'));
