-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'agent'
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moveInDate" DATETIME NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "complex" TEXT NOT NULL,
    "tenantFname" TEXT NOT NULL,
    "tenantLname" TEXT NOT NULL,
    "apartmentNumber" TEXT NOT NULL,
    "rentAmount" REAL NOT NULL,
    "commissionType" TEXT NOT NULL,
    "commissionDue" REAL NOT NULL,
    "extraNotes" TEXT,
    "paidStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Draw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
