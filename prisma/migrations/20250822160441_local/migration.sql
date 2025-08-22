-- CreateEnum
CREATE TYPE "public"."Permissions" AS ENUM ('owner', 'agent');

-- CreateEnum
CREATE TYPE "public"."CommissionType" AS ENUM ('percent', 'flat');

-- CreateEnum
CREATE TYPE "public"."PaidStatus" AS ENUM ('unpaid', 'paid', 'goingToPay', 'chargeback', 'partially');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "permissions" "public"."Permissions" NOT NULL DEFAULT 'agent',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lease" (
    "id" TEXT NOT NULL,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "complex" TEXT NOT NULL,
    "tenantFname" TEXT NOT NULL,
    "tenantLname" TEXT NOT NULL,
    "apartmentNumber" TEXT NOT NULL,
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "commissionType" "public"."CommissionType" NOT NULL,
    "commissionPrecent" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION NOT NULL,
    "extraNotes" TEXT,
    "paidStatus" "public"."PaidStatus" NOT NULL DEFAULT 'unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Draw" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- AddForeignKey
ALTER TABLE "public"."Lease" ADD CONSTRAINT "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Draw" ADD CONSTRAINT "Draw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
