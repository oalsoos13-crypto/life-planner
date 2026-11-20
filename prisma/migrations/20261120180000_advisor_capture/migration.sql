-- AlterTable
ALTER TABLE "Capture" ADD COLUMN     "analyzer" TEXT,
ADD COLUMN     "error" TEXT;

-- CreateTable
CREATE TABLE "CaptureItem" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "chain" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "undo" JSONB,
    "undoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "category" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvisorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaptureItem_createdAt_idx" ON "CaptureItem"("createdAt");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "AdvisorMessage_createdAt_idx" ON "AdvisorMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "CaptureItem" ADD CONSTRAINT "CaptureItem_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- قيود (DDIA): نوع العنصر محدود، والمصروف موجب
ALTER TABLE "CaptureItem" ADD CONSTRAINT "captureitem_kind_values" CHECK ("kind" IN ('TASK','HABIT','EXPENSE','METRIC','ENERGY','MOOD','NOTE'));
ALTER TABLE "Expense" ADD CONSTRAINT "expense_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "AdvisorMessage" ADD CONSTRAINT "advisor_role_values" CHECK ("role" IN ('user','assistant'));
