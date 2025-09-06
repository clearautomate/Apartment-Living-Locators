/*
  Warnings:

  - You are about to drop the column `invoiceNumber` on the `Payment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_leaseId_invoiceNumber_fkey";

-- DropIndex
DROP INDEX "public"."Lease_id_invoiceNumber_key";

-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "invoiceNumber";

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "public"."Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
