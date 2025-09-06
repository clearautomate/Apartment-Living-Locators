/*
  Warnings:

  - You are about to drop the column `commissionPrecent` on the `Lease` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Lease" DROP COLUMN "commissionPrecent",
ADD COLUMN     "commissionPercent" DOUBLE PRECISION;
