/*
  Warnings:

  - The `paidDifference` column on the `Lease` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `totalPaid` column on the `Lease` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Lease" DROP COLUMN "paidDifference",
ADD COLUMN     "paidDifference" DOUBLE PRECISION,
DROP COLUMN "totalPaid",
ADD COLUMN     "totalPaid" DOUBLE PRECISION;
