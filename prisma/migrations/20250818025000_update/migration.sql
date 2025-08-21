/*
  Warnings:

  - You are about to drop the column `commissionDue` on the `Lease` table. All the data in the column will be lost.
  - Added the required column `commission` to the `Lease` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "commission" REAL NOT NULL,
    "extraNotes" TEXT,
    "paidStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lease" ("apartmentNumber", "commissionType", "complex", "createdAt", "extraNotes", "id", "invoiceNumber", "moveInDate", "paidStatus", "rentAmount", "tenantFname", "tenantLname", "userId") SELECT "apartmentNumber", "commissionType", "complex", "createdAt", "extraNotes", "id", "invoiceNumber", "moveInDate", "paidStatus", "rentAmount", "tenantFname", "tenantLname", "userId" FROM "Lease";
DROP TABLE "Lease";
ALTER TABLE "new_Lease" RENAME TO "Lease";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
