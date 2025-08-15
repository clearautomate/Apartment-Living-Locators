/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `Lease` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Draw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Draw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Draw" ("amount", "date", "id", "userId") SELECT "amount", "date", "id", "userId" FROM "Draw";
DROP TABLE "Draw";
ALTER TABLE "new_Draw" RENAME TO "Draw";
CREATE TABLE "new_Lease" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lease" ("apartmentNumber", "commissionDue", "commissionType", "complex", "extraNotes", "id", "invoiceNumber", "moveInDate", "paidStatus", "rentAmount", "tenantFname", "tenantLname", "userId") SELECT "apartmentNumber", "commissionDue", "commissionType", "complex", "extraNotes", "id", "invoiceNumber", "moveInDate", "paidStatus", "rentAmount", "tenantFname", "tenantLname", "userId" FROM "Lease";
DROP TABLE "Lease";
ALTER TABLE "new_Lease" RENAME TO "Lease";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'agent',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("email", "fname", "id", "lname", "password", "permissions", "username") SELECT "email", "fname", "id", "lname", "password", "permissions", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
