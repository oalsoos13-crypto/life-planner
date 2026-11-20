-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "businessFaq" TEXT,
ADD COLUMN     "waAutoReply" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "waId" TEXT,
    "peer" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPost_scheduledAt_idx" ON "SocialPost"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaMessage_waId_key" ON "WaMessage"("waId");

-- CreateIndex
CREATE INDEX "WaMessage_peer_createdAt_idx" ON "WaMessage"("peer", "createdAt");


-- قيود المجال
ALTER TABLE "SocialPost" ADD CONSTRAINT "socialpost_status_values" CHECK ("status" IN ('DRAFT','SCHEDULED','FAILED'));
ALTER TABLE "WaMessage" ADD CONSTRAINT "wamessage_direction_values" CHECK ("direction" IN ('IN','OUT'));
