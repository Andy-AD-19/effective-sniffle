-- FMOH Institutional Inventory - Cloudflare D1 Database Schema
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "departmentId" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "UnitOfMeasure" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "FundingSource" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "StoreLocation" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "StorageLocation" (
    "id" TEXT PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL UNIQUE,
    "roomOrZone" TEXT,
    "shelfNumber" TEXT NOT NULL,
    "rackNumber" TEXT,
    "binNumber" TEXT NOT NULL,
    "description" TEXT,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "gtin" TEXT,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CONSUMABLE',
    "categoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "defaultLocationId" TEXT,
    "reorderLevel" REAL NOT NULL DEFAULT 0,
    "minimumStock" REAL NOT NULL DEFAULT 0,
    "maximumStock" REAL NOT NULL DEFAULT 0,
    "fundingSourceId" TEXT,
    "batchTrackingRequired" INTEGER NOT NULL DEFAULT 0,
    "expiryTrackingRequired" INTEGER NOT NULL DEFAULT 0,
    "barcodeRequired" INTEGER NOT NULL DEFAULT 1,
    "active" INTEGER NOT NULL DEFAULT 1,
    "subCategory" TEXT,
    "serialNumber" TEXT,
    "modelNumber" TEXT,
    "depreciationRate" REAL,
    "maintenanceCycle" TEXT,
    "departmentAssignmentId" TEXT,
    "calibrationDueDate" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "SupplierDonor" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "type" TEXT NOT NULL DEFAULT 'SUPPLIER',
    "contact" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "DisposalReason" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "GoodsReceivingNote" (
    "id" TEXT PRIMARY KEY,
    "grnNumber" TEXT NOT NULL UNIQUE,
    "sourceType" TEXT NOT NULL,
    "purchaseOrderRef" TEXT,
    "donationLetterRef" TEXT,
    "governmentAllocationRef" TEXT,
    "projectSupportRef" TEXT,
    "deliveryNoteRef" TEXT,
    "supplierDonorId" TEXT,
    "receivedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "GoodsReceivingLine" (
    "id" TEXT PRIMARY KEY,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityReceived" REAL NOT NULL,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "expiryDate" TEXT,
    "fundingSourceId" TEXT,
    "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StockBatch" (
    "id" TEXT PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "grnLineId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TEXT,
    "receivedDate" TEXT NOT NULL DEFAULT (datetime('now')),
    "unitCost" REAL DEFAULT 0,
    "fundingSourceId" TEXT,
    "sourceReference" TEXT,
    "totalAcceptedQuantity" REAL NOT NULL,
    "remainingQuantity" REAL NOT NULL,
    "barcodeValue" TEXT,
    "qrCodeValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_STORAGE',
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "StockLocationBalance" (
    "id" TEXT PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storageLocationId" TEXT NOT NULL,
    "quantityOnHand" REAL NOT NULL DEFAULT 0,
    "quantityReserved" REAL NOT NULL DEFAULT 0,
    "quantityAvailable" REAL NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "StockIssueVoucher" (
    "id" TEXT PRIMARY KEY,
    "sivNumber" TEXT NOT NULL UNIQUE,
    "departmentId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "issuedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "remarks" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "StockIssueLine" (
    "id" TEXT PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityRequested" REAL NOT NULL,
    "quantityApproved" REAL,
    "quantityIssued" REAL,
    "batchId" TEXT,
    "storageLocationId" TEXT,
    "unitPrice" REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "ItemReturn" (
    "id" TEXT PRIMARY KEY,
    "returnNumber" TEXT NOT NULL UNIQUE,
    "departmentId" TEXT NOT NULL,
    "returnedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_INSPECTION',
    "remarks" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "ItemReturnLine" (
    "id" TEXT PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityReturned" REAL NOT NULL,
    "quantityAccepted" REAL DEFAULT 0,
    "quantityRejected" REAL DEFAULT 0,
    "condition" TEXT,
    "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StockLedgerEntry" (
    "id" TEXT PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "storeId" TEXT,
    "storageLocationId" TEXT,
    "entryType" TEXT NOT NULL,
    "quantityIn" REAL NOT NULL DEFAULT 0,
    "quantityOut" REAL NOT NULL DEFAULT 0,
    "balanceAfter" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL DEFAULT 0,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "PhysicalCount" (
    "id" TEXT PRIMARY KEY,
    "countNumber" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "conductedById" TEXT NOT NULL,
    "reconciledById" TEXT,
    "remarks" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "PhysicalCountLine" (
    "id" TEXT PRIMARY KEY,
    "countId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storageLocationId" TEXT NOT NULL,
    "systemQuantity" REAL NOT NULL,
    "countedQuantity" REAL NOT NULL,
    "discrepancy" REAL NOT NULL,
    "remarks" TEXT
);

CREATE TABLE IF NOT EXISTS "StockDisposal" (
    "id" TEXT PRIMARY KEY,
    "disposalNumber" TEXT NOT NULL UNIQUE,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantity" REAL NOT NULL,
    "reasonId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedById" TEXT,
    "remarks" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "StockAdjustment" (
    "id" TEXT PRIMARY KEY,
    "adjustmentNumber" TEXT NOT NULL UNIQUE,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantityDelta" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
