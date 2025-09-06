/*
  Warnings:

  - A unique constraint covering the columns `[id,invoiceNumber]` on the table `Lease` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoiceNumber` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_leaseId_fkey";

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "invoiceNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lease_id_invoiceNumber_key" ON "public"."Lease"("id", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_leaseId_invoiceNumber_fkey" FOREIGN KEY ("leaseId", "invoiceNumber") REFERENCES "public"."Lease"("id", "invoiceNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
