-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('full', 'partial', 'chargeback');

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "paymentType" "public"."PaymentType" NOT NULL DEFAULT 'partial',
ALTER COLUMN "date" DROP DEFAULT;
