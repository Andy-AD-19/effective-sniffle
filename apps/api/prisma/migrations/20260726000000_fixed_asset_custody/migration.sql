CREATE TABLE "FixedAssetCustody" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "assetTag" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "custodianName" TEXT NOT NULL,
  "custodianDepartmentId" TEXT,
  "location" TEXT,
  "condition" TEXT NOT NULL DEFAULT 'GOOD',
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnedAt" DATETIME,
  "notes" TEXT,
  "assignedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FixedAssetCustody_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FixedAssetCustody_custodianDepartmentId_fkey" FOREIGN KEY ("custodianDepartmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FixedAssetCustody_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FixedAssetCustody_assetTag_key" ON "FixedAssetCustody"("assetTag");
CREATE UNIQUE INDEX "FixedAssetCustody_itemId_serialNumber_key" ON "FixedAssetCustody"("itemId", "serialNumber");
CREATE INDEX "FixedAssetCustody_itemId_idx" ON "FixedAssetCustody"("itemId");
CREATE INDEX "FixedAssetCustody_status_idx" ON "FixedAssetCustody"("status");
CREATE INDEX "FixedAssetCustody_custodianDepartmentId_idx" ON "FixedAssetCustody"("custodianDepartmentId");
