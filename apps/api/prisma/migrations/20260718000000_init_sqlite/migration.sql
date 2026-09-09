-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "departmentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "FundingSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "roomOrZone" TEXT,
    "shelfNumber" TEXT NOT NULL,
    "rackNumber" TEXT,
    "binNumber" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StorageLocation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "storeLocationId" TEXT NOT NULL,
    CONSTRAINT "Shelf_storeLocationId_fkey" FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    CONSTRAINT "Bin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CONSUMABLE',
    "categoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "defaultLocationId" TEXT,
    "reorderLevel" DECIMAL NOT NULL,
    "minimumStock" DECIMAL NOT NULL,
    "maximumStock" DECIMAL NOT NULL,
    "fundingSourceId" TEXT,
    "batchTrackingRequired" BOOLEAN NOT NULL DEFAULT false,
    "expiryTrackingRequired" BOOLEAN NOT NULL DEFAULT false,
    "barcodeRequired" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "photoFileId" TEXT,
    "documentFileId" TEXT,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "StoreLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "UploadedFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_documentFileId_fkey" FOREIGN KEY ("documentFileId") REFERENCES "UploadedFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierDonor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contact" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "GoodsReceivingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "purchaseOrderRef" TEXT,
    "donationLetterRef" TEXT,
    "governmentAllocationRef" TEXT,
    "projectSupportRef" TEXT,
    "deliveryNoteRef" TEXT,
    "supplierDonorId" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsReceivingNote_supplierDonorId_fkey" FOREIGN KEY ("supplierDonorId") REFERENCES "SupplierDonor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceivingLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityReceived" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "fundingSourceId" TEXT,
    "remarks" TEXT,
    CONSTRAINT "GoodsReceivingLine_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceivingNote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceivingLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceivingLine_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "grnLineId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "receivedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unitCost" DECIMAL,
    "fundingSourceId" TEXT,
    "sourceReference" TEXT,
    "totalAcceptedQuantity" DECIMAL NOT NULL,
    "remainingQuantity" DECIMAL NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "qrCodeValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_STORAGE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockBatch_grnLineId_fkey" FOREIGN KEY ("grnLineId") REFERENCES "GoodsReceivingLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockBatch_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockLocationBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storageLocationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL NOT NULL,
    "quantityReserved" DECIMAL NOT NULL DEFAULT 0,
    "quantityAvailable" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockLocationBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockLocationBalance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockLocationBalance_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockLocationBalance_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BarcodeQRCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "locationBalanceId" TEXT,
    "storageLocationId" TEXT,
    "format" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BarcodeQRCode_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BarcodeQRCode_locationBalanceId_fkey" FOREIGN KEY ("locationBalanceId") REFERENCES "StockLocationBalance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BarcodeQRCode_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BarcodeQRCode_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadedFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnLineId" TEXT NOT NULL,
    "quantityVerified" DECIMAL NOT NULL,
    "quantityAccepted" DECIMAL NOT NULL,
    "quantityRejected" DECIMAL NOT NULL,
    "outcome" TEXT NOT NULL,
    "qualityStatus" TEXT NOT NULL DEFAULT 'PASS',
    "qualityNotes" TEXT,
    "rejectionReason" TEXT,
    "remarks" TEXT,
    "storeLocationId" TEXT,
    "shelfCode" TEXT,
    "binCode" TEXT,
    "barcode" TEXT,
    "inspectedById" TEXT NOT NULL,
    "inspectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inspection_grnLineId_fkey" FOREIGN KEY ("grnLineId") REFERENCES "GoodsReceivingLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssueRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssueRequestLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueRequestId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    CONSTRAINT "IssueRequestLine_issueRequestId_fkey" FOREIGN KEY ("issueRequestId") REFERENCES "IssueRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IssueRequestLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreIssueVoucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherNumber" TEXT NOT NULL,
    "issueRequestId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreIssueVoucher_issueRequestId_fkey" FOREIGN KEY ("issueRequestId") REFERENCES "IssueRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepartmentMaterialReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL,
    "issueRequestId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "DepartmentMaterialReceipt_issueRequestId_fkey" FOREIGN KEY ("issueRequestId") REFERENCES "IssueRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DepartmentMaterialReceipt_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "StoreIssueVoucher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DepartmentMaterialReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT,
    "decisionReason" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueRequestId" TEXT,
    CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_issueRequestId_fkey" FOREIGN KEY ("issueRequestId") REFERENCES "IssueRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitCost" DECIMAL,
    "batchId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "storeLocationId" TEXT,
    "storageLocationId" TEXT,
    "shelfCode" TEXT,
    "binCode" TEXT,
    "sourceEntity" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "grnLineId" TEXT,
    "voucherId" TEXT,
    "actorId" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "StockLedgerEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockLedgerEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockLedgerEntry_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockLedgerEntry_grnLineId_fkey" FOREIGN KEY ("grnLineId") REFERENCES "GoodsReceivingLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockLedgerEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "StoreIssueVoucher" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockLedgerEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhysicalCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countNumber" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "locationId" TEXT,
    "categoryId" TEXT,
    "openedById" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PhysicalCountLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "physicalCountId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "storageLocationId" TEXT,
    "storeId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "systemQuantity" DECIMAL NOT NULL,
    "countedQuantity" DECIMAL,
    "variance" DECIMAL,
    "notes" TEXT,
    CONSTRAINT "PhysicalCountLine_physicalCountId_fkey" FOREIGN KEY ("physicalCountId") REFERENCES "PhysicalCount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PhysicalCountLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adjustmentNumber" TEXT NOT NULL,
    "physicalCountId" TEXT,
    "physicalCountLineId" TEXT,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "storageLocationId" TEXT,
    "storeId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "quantityDelta" DECIMAL NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "approverId" TEXT,
    "approvalComment" TEXT,
    "decidedAt" DATETIME,
    "ledgerEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAdjustment_physicalCountId_fkey" FOREIGN KEY ("physicalCountId") REFERENCES "PhysicalCount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockAdjustment_physicalCountLineId_fkey" FOREIGN KEY ("physicalCountLineId") REFERENCES "PhysicalCountLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DisposalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disposalNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "reason" TEXT NOT NULL,
    "committeeNotes" TEXT,
    "approvalId" TEXT,
    "method" TEXT,
    "disposedAt" DATETIME,
    "responsibleParties" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DisposalLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disposalRequestId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "storageLocationId" TEXT,
    "storeId" TEXT,
    "quantity" DECIMAL NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    CONSTRAINT "DisposalLine_disposalRequestId_fkey" FOREIGN KEY ("disposalRequestId") REFERENCES "DisposalRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DisposalLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_name_key" ON "UnitOfMeasure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_symbol_key" ON "UnitOfMeasure"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "FundingSource_name_key" ON "FundingSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StoreLocation_name_key" ON "StoreLocation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StoreLocation_code_key" ON "StoreLocation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StorageLocation_locationCode_key" ON "StorageLocation"("locationCode");

-- CreateIndex
CREATE INDEX "StorageLocation_storeId_idx" ON "StorageLocation"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_storeLocationId_code_key" ON "Shelf"("storeLocationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_shelfId_code_key" ON "Bin"("shelfId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_active_idx" ON "Item"("active");

-- CreateIndex
CREATE INDEX "Item_fundingSourceId_idx" ON "Item"("fundingSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceivingNote_grnNumber_key" ON "GoodsReceivingNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceivingNote_sourceType_status_receivedAt_idx" ON "GoodsReceivingNote"("sourceType", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "GoodsReceivingLine_itemId_batchNumber_expiryDate_idx" ON "GoodsReceivingLine"("itemId", "batchNumber", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_barcodeValue_key" ON "StockBatch"("barcodeValue");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_qrCodeValue_key" ON "StockBatch"("qrCodeValue");

-- CreateIndex
CREATE INDEX "StockBatch_itemId_batchNumber_expiryDate_idx" ON "StockBatch"("itemId", "batchNumber", "expiryDate");

-- CreateIndex
CREATE INDEX "StockBatch_status_idx" ON "StockBatch"("status");

-- CreateIndex
CREATE INDEX "StockLocationBalance_itemId_idx" ON "StockLocationBalance"("itemId");

-- CreateIndex
CREATE INDEX "StockLocationBalance_storeId_storageLocationId_idx" ON "StockLocationBalance"("storeId", "storageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocationBalance_batchId_storageLocationId_key" ON "StockLocationBalance"("batchId", "storageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeQRCode_value_key" ON "BarcodeQRCode"("value");

-- CreateIndex
CREATE INDEX "BarcodeQRCode_batchId_idx" ON "BarcodeQRCode"("batchId");

-- CreateIndex
CREATE INDEX "BarcodeQRCode_value_idx" ON "BarcodeQRCode"("value");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_storedName_key" ON "UploadedFile"("storedName");

-- CreateIndex
CREATE INDEX "UploadedFile_category_idx" ON "UploadedFile"("category");

-- CreateIndex
CREATE INDEX "UploadedFile_uploadedById_idx" ON "UploadedFile"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_grnLineId_key" ON "Inspection"("grnLineId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueRequest_requestNumber_key" ON "IssueRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StoreIssueVoucher_voucherNumber_key" ON "StoreIssueVoucher"("voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StoreIssueVoucher_issueRequestId_key" ON "StoreIssueVoucher"("issueRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMaterialReceipt_receiptNumber_key" ON "DepartmentMaterialReceipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMaterialReceipt_issueRequestId_key" ON "DepartmentMaterialReceipt"("issueRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMaterialReceipt_voucherId_key" ON "DepartmentMaterialReceipt"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_issueRequestId_key" ON "ApprovalRequest"("issueRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLedgerEntry_entryNumber_key" ON "StockLedgerEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_itemId_batchNumber_expiryDate_idx" ON "StockLedgerEntry"("itemId", "batchNumber", "expiryDate");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_type_postedAt_idx" ON "StockLedgerEntry"("type", "postedAt");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_sourceEntity_sourceId_idx" ON "StockLedgerEntry"("sourceEntity", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalCount_countNumber_key" ON "PhysicalCount"("countNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_adjustmentNumber_key" ON "StockAdjustment"("adjustmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_physicalCountLineId_key" ON "StockAdjustment"("physicalCountLineId");

-- CreateIndex
CREATE INDEX "StockAdjustment_status_idx" ON "StockAdjustment"("status");

-- CreateIndex
CREATE INDEX "StockAdjustment_itemId_idx" ON "StockAdjustment"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalRequest_disposalNumber_key" ON "DisposalRequest"("disposalNumber");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
