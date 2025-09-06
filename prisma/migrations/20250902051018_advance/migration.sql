-- AlterEnum
ALTER TYPE "public"."PaymentType" ADD VALUE 'advance';

-- AlterTable
ALTER TABLE "public"."Payment" ALTER COLUMN "paymentType" DROP DEFAULT;
