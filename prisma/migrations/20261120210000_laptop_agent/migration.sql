-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "agentSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AgentJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "folder" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "standing" BOOLEAN NOT NULL DEFAULT false,
    "repeatDay" INTEGER,
    "summary" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentJob_status_idx" ON "AgentJob"("status");


-- قيود المجال
ALTER TABLE "AgentJob" ADD CONSTRAINT "agentjob_kind_values" CHECK ("kind" IN ('EXCEL_REPORT','EMAIL','OTHER'));
ALTER TABLE "AgentJob" ADD CONSTRAINT "agentjob_status_values" CHECK ("status" IN ('QUEUED','RUNNING','NEEDS_APPROVAL','APPROVED','SENDING','DONE','FAILED','CANCELLED'));
ALTER TABLE "AgentJob" ADD CONSTRAINT "agentjob_repeat_day" CHECK ("repeatDay" IS NULL OR ("repeatDay" BETWEEN 0 AND 6));
