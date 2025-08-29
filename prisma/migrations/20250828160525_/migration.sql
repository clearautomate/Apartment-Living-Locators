/*
  Warnings:

  - The values [goingToPay] on the enum `PaidStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaidStatus_new" AS ENUM ('unpaid', 'paid', 'partially', 'chargeback');
ALTER TABLE "public"."Lease" ALTER COLUMN "paidStatus" DROP DEFAULT;
ALTER TABLE "public"."Lease" ALTER COLUMN "paidStatus" TYPE "public"."PaidStatus_new" USING ("paidStatus"::text::"public"."PaidStatus_new");
ALTER TYPE "public"."PaidStatus" RENAME TO "PaidStatus_old";
ALTER TYPE "public"."PaidStatus_new" RENAME TO "PaidStatus";
DROP TYPE "public"."PaidStatus_old";
ALTER TABLE "public"."Lease" ALTER COLUMN "paidStatus" SET DEFAULT 'unpaid';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Lease" ADD COLUMN     "paidDifference" TEXT,
ADD COLUMN     "tenantEmail" TEXT,
ADD COLUMN     "totalPaid" TEXT;

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "public"."Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
