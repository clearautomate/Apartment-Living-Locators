-- CreateTable
CREATE TABLE "public"."MonthlyCounter" (
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MonthlyCounter_pkey" PRIMARY KEY ("userId","month","year")
);

-- AddForeignKey
ALTER TABLE "public"."MonthlyCounter" ADD CONSTRAINT "MonthlyCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
