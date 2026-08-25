-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- DropIndex
DROP INDEX "Client_nationalId_key";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "nationalIdHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LoanApplication" ADD COLUMN     "disclosureAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "disclosureAcknowledgedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT;

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_period_key" ON "AccountingPeriod"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Client_nationalIdHash_key" ON "Client"("nationalIdHash");

