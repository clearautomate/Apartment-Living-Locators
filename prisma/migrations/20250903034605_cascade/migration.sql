-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_leaseId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "public"."Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
