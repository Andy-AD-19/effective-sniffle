PRAGMA defer_foreign_keys=TRUE;
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
INSERT INTO "Item" ("id","code","gtin","description","kind","categoryId","unitId","defaultLocationId","reorderLevel","minimumStock","maximumStock","fundingSourceId","batchTrackingRequired","expiryTrackingRequired","barcodeRequired","active","subCategory","serialNumber","modelNumber","depreciationRate","maintenanceCycle","departmentAssignmentId","calibrationDueDate","createdById","updatedById","createdAt","updatedAt") VALUES('item-7865','7865',NULL,'pen','GENERAL_SUPPLY','cat-fur','unit-box','store-main',10,5,30,'fund-gov',1,0,1,1,'Stationery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-20 10:38:00','2026-09-20 10:38:00');
INSERT INTO "Item" ("id","code","gtin","description","kind","categoryId","unitId","defaultLocationId","reorderLevel","minimumStock","maximumStock","fundingSourceId","batchTrackingRequired","expiryTrackingRequired","barcodeRequired","active","subCategory","serialNumber","modelNumber","depreciationRate","maintenanceCycle","departmentAssignmentId","calibrationDueDate","createdById","updatedById","createdAt","updatedAt") VALUES('item-9999','9999',NULL,'pc','GENERAL_SUPPLY','cat-it','unit-pc','store-main',10,5,1000,'fund-fed',1,1,1,1,'Office Supplies',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-20 18:34:21','2026-09-20 18:34:21');
INSERT INTO "Item" ("id","code","gtin","description","kind","categoryId","unitId","defaultLocationId","reorderLevel","minimumStock","maximumStock","fundingSourceId","batchTrackingRequired","expiryTrackingRequired","barcodeRequired","active","subCategory","serialNumber","modelNumber","depreciationRate","maintenanceCycle","departmentAssignmentId","calibrationDueDate","createdById","updatedById","createdAt","updatedAt") VALUES('item-5675','5675',NULL,'printer','GENERAL_SUPPLY','cat-it','unit-ea','store-main',15,10,100,'fund-fed',1,1,1,1,'Office Supplies',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-20 18:57:26','2026-09-20 18:57:26');
INSERT INTO "Item" ("id","code","gtin","description","kind","categoryId","unitId","defaultLocationId","reorderLevel","minimumStock","maximumStock","fundingSourceId","batchTrackingRequired","expiryTrackingRequired","barcodeRequired","active","subCategory","serialNumber","modelNumber","depreciationRate","maintenanceCycle","departmentAssignmentId","calibrationDueDate","createdById","updatedById","createdAt","updatedAt") VALUES('item-4634','4634',NULL,'cube','GENERAL_SUPPLY','cat-fur','unit-ea','store-main',8,5,20,'fund-gov',1,0,1,1,'Stationery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-21 15:41:54','2026-09-21 15:41:54');
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
INSERT INTO "GoodsReceivingNote" ("id","grnNumber","sourceType","purchaseOrderRef","donationLetterRef","governmentAllocationRef","projectSupportRef","deliveryNoteRef","supplierDonorId","receivedAt","createdById","status","remarks","createdAt","updatedAt") VALUES('grn-dar475n','GRN-815131','PROCUREMENT','chjbk','','','','','sup-01','2026-09-19T18:16:55.131Z','usr-store','ACCEPTED','DOT pencil','2026-09-19 18:16:55','2026-09-19 18:19:53');
INSERT INTO "GoodsReceivingNote" ("id","grnNumber","sourceType","purchaseOrderRef","donationLetterRef","governmentAllocationRef","projectSupportRef","deliveryNoteRef","supplierDonorId","receivedAt","createdById","status","remarks","createdAt","updatedAt") VALUES('grn-w2dglbc','GRN-768092','PROCUREMENT','567777','','','','','sup-01','2026-09-20T10:39:28.092Z','usr-store','ACCEPTED','pen','2026-09-20 10:39:28','2026-09-20 10:40:25');
INSERT INTO "GoodsReceivingNote" ("id","grnNumber","sourceType","purchaseOrderRef","donationLetterRef","governmentAllocationRef","projectSupportRef","deliveryNoteRef","supplierDonorId","receivedAt","createdById","status","remarks","createdAt","updatedAt") VALUES('grn-d1z6dn3','GRN-320173','GOVERNMENT_ALLOCATION','','','','','','sup-01','2026-09-20T18:35:20.173Z','usr-store','ACCEPTED','','2026-09-20 18:35:20','2026-09-20 18:41:44');
INSERT INTO "GoodsReceivingNote" ("id","grnNumber","sourceType","purchaseOrderRef","donationLetterRef","governmentAllocationRef","projectSupportRef","deliveryNoteRef","supplierDonorId","receivedAt","createdById","status","remarks","createdAt","updatedAt") VALUES('grn-cblomk4','GRN-699546','PROCUREMENT','','','','','','sup-01','2026-09-20T18:58:19.546Z','usr-store','ACCEPTED','','2026-09-20 18:58:19','2026-09-20 18:59:55');
INSERT INTO "GoodsReceivingNote" ("id","grnNumber","sourceType","purchaseOrderRef","donationLetterRef","governmentAllocationRef","projectSupportRef","deliveryNoteRef","supplierDonorId","receivedAt","createdById","status","remarks","createdAt","updatedAt") VALUES('grn-g6pmuxd','GRN-450215','PROCUREMENT','','','','','','sup-01','2026-09-21T15:44:10.215Z','usr-store','ACCEPTED','','2026-09-21 15:44:10','2026-09-21 15:46:00');
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
INSERT INTO "GoodsReceivingLine" ("id","grnId","itemId","quantityReceived","unitPrice","batchNumber","expiryDate","fundingSourceId","remarks") VALUES('line-9qxwxac','grn-dar475n','item-123',45,3500,'fgbh',NULL,'fund-gov',NULL);
INSERT INTO "GoodsReceivingLine" ("id","grnId","itemId","quantityReceived","unitPrice","batchNumber","expiryDate","fundingSourceId","remarks") VALUES('line-s5l578b','grn-w2dglbc','item-7865',50,30,'111222332',NULL,'fund-gov',NULL);
INSERT INTO "GoodsReceivingLine" ("id","grnId","itemId","quantityReceived","unitPrice","batchNumber","expiryDate","fundingSourceId","remarks") VALUES('line-x728uc5','grn-d1z6dn3','item-24696',700,30000,'hou55','2030-06-20','fund-gov',NULL);
INSERT INTO "GoodsReceivingLine" ("id","grnId","itemId","quantityReceived","unitPrice","batchNumber","expiryDate","fundingSourceId","remarks") VALUES('line-lund42q','grn-cblomk4','item-5675',50,1099,'pppp','2029-06-18','fund-gov',NULL);
INSERT INTO "GoodsReceivingLine" ("id","grnId","itemId","quantityReceived","unitPrice","batchNumber","expiryDate","fundingSourceId","remarks") VALUES('line-8b626xv','grn-g6pmuxd','item-4634',15,5000,'567346',NULL,'fund-gov',NULL);
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
INSERT INTO "StockBatch" ("id","itemId","grnLineId","batchNumber","expiryDate","receivedDate","unitCost","fundingSourceId","sourceReference","totalAcceptedQuantity","remainingQuantity","barcodeValue","qrCodeValue","status","createdAt","updatedAt") VALUES('batch-icce4gl','item-123','line-9qxwxac','fgbh','','2026-09-19 18:19:53',3500,NULL,NULL,45,0,NULL,NULL,'AVAILABLE','2026-09-19 18:19:53','2026-09-19 18:23:26');
INSERT INTO "StockBatch" ("id","itemId","grnLineId","batchNumber","expiryDate","receivedDate","unitCost","fundingSourceId","sourceReference","totalAcceptedQuantity","remainingQuantity","barcodeValue","qrCodeValue","status","createdAt","updatedAt") VALUES('batch-3uqxoqe','item-7865','line-s5l578b','111222332','','2026-09-20 10:40:25',30,NULL,NULL,50,0,NULL,NULL,'AVAILABLE','2026-09-20 10:40:25','2026-09-20 10:42:30');
INSERT INTO "StockBatch" ("id","itemId","grnLineId","batchNumber","expiryDate","receivedDate","unitCost","fundingSourceId","sourceReference","totalAcceptedQuantity","remainingQuantity","barcodeValue","qrCodeValue","status","createdAt","updatedAt") VALUES('batch-l5pwlhz','item-24696','line-x728uc5','hou55','2030-06-20','2026-09-20 18:41:44',30000,NULL,NULL,700,179,NULL,NULL,'PENDING_STORAGE','2026-09-20 18:41:44','2026-09-20 18:54:35');
INSERT INTO "StockBatch" ("id","itemId","grnLineId","batchNumber","expiryDate","receivedDate","unitCost","fundingSourceId","sourceReference","totalAcceptedQuantity","remainingQuantity","barcodeValue","qrCodeValue","status","createdAt","updatedAt") VALUES('batch-vrecopd','item-5675','line-lund42q','pppp','2029-06-18','2026-09-20 18:59:54',1099,NULL,NULL,50,0,NULL,NULL,'AVAILABLE','2026-09-20 18:59:54','2026-09-20 19:01:57');
INSERT INTO "StockBatch" ("id","itemId","grnLineId","batchNumber","expiryDate","receivedDate","unitCost","fundingSourceId","sourceReference","totalAcceptedQuantity","remainingQuantity","barcodeValue","qrCodeValue","status","createdAt","updatedAt") VALUES('batch-frqma5r','item-4634','line-8b626xv','567346','','2026-09-21 15:45:59',5000,NULL,NULL,15,0,NULL,NULL,'AVAILABLE','2026-09-21 15:45:59','2026-09-21 15:47:31');
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
INSERT INTO "StockLocationBalance" ("id","itemId","batchId","storeId","storageLocationId","quantityOnHand","quantityReserved","quantityAvailable","createdAt","updatedAt") VALUES('bal-itxf67r','item-123','batch-icce4gl','store-main','loc-01',44,0,45,'2026-09-19 18:23:26','2026-09-19 20:32:55');
INSERT INTO "StockLocationBalance" ("id","itemId","batchId","storeId","storageLocationId","quantityOnHand","quantityReserved","quantityAvailable","createdAt","updatedAt") VALUES('bal-qh5ke88','item-7865','batch-3uqxoqe','store-main','loc-01',47,0,50,'2026-09-20 10:41:26','2026-09-20 10:47:43');
INSERT INTO "StockLocationBalance" ("id","itemId","batchId","storeId","storageLocationId","quantityOnHand","quantityReserved","quantityAvailable","createdAt","updatedAt") VALUES('bal-cwp1xzy','item-24696','batch-l5pwlhz','store-main','loc-01',0,0,1,'2026-09-20 18:46:05','2026-09-20 18:54:34');
INSERT INTO "StockLocationBalance" ("id","itemId","batchId","storeId","storageLocationId","quantityOnHand","quantityReserved","quantityAvailable","createdAt","updatedAt") VALUES('bal-qaf9ars','item-24696','batch-l5pwlhz','store-gen','loc-04',481,0,500,'2026-09-20 18:47:25','2026-09-20 18:54:34');
INSERT INTO "StockLocationBalance" ("id","itemId","batchId","storeId","storageLocationId","quantityOnHand","quantityReserved","quantityAvailable","createdAt","updatedAt") VALUES('bal-nylwg2m','item-5675','batch-vrecopd','store-gen','loc-04',40,0,50,'2026-09-20 19:01:58','2026-09-20 19:05:42');
INSERT INTO "StockLocationBalance" ("id","itemId","batchId","storeId","storageLocationId","quantityOnHand","quantityReserved","quantityAvailable","createdAt","updatedAt") VALUES('bal-05pb4hl','item-4634','batch-frqma5r','store-main','loc-01',12,0,15,'2026-09-21 15:47:31','2026-09-21 15:52:34');
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
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-chlq620','SIV-711396','dept-adm','Grace Okoro','stationary','usr-req','usr-app',NULL,'REJECTED',NULL,'2026-09-19 18:15:11','2026-09-19 18:15:52');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-qgw8ijm','SIV-238588','dept-adm','Amina Yusuf','stationary','usr-admin','usr-app','usr-store','ISSUED',NULL,'2026-09-19 18:23:58','2026-09-19 20:32:55');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-ubrx4nr','SIV-812120','dept-adm','Amina Yusuf','maintenance','usr-admin','usr-admin','usr-store','ISSUED',NULL,'2026-09-19 19:40:12','2026-09-19 20:30:56');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-n2d4ait','SIV-076661','dept-adm','Grace Okoro','stationary','usr-req','usr-app','usr-store','ISSUED',NULL,'2026-09-20 10:44:36','2026-09-20 10:45:49');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-sigu2si','SIV-242095','dept-adm','Amina Yusuf','stationery','usr-admin','usr-admin','usr-admin','COMPLETED',NULL,'2026-09-20 10:47:22','2026-09-20 10:47:58');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-1pmiqbl','SIV-380646','dept-adm','samuel','office use','usr-req','usr-app','usr-store','ISSUED',NULL,'2026-09-20 18:53:00','2026-09-20 18:54:35');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-t3guj77','SIV-010960','dept-adm','bk','office use','usr-req','usr-app','usr-store','ISSUED',NULL,'2026-09-20 19:03:31','2026-09-20 19:05:42');
INSERT INTO "StockIssueVoucher" ("id","sivNumber","departmentId","recipientName","purpose","createdById","approvedById","issuedById","status","remarks","createdAt","updatedAt") VALUES('siv-1nq5ldi','SIV-829125','dept-adm','Grace Okoro','amusement','usr-req','usr-app','usr-store','ISSUED',NULL,'2026-09-21 15:50:29','2026-09-21 15:52:34');
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
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-k0lf61z','siv-chlq620','item-123',5,0,0,NULL,NULL,0);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-dglvplz','siv-qgw8ijm','item-123',1,1,0,NULL,NULL,0);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-5u6hph9','siv-ubrx4nr','item-screw',5,5,0,NULL,NULL,0);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-m1nt7gx','siv-n2d4ait','item-23445',10,10,10,NULL,NULL,0);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-zr3djqd','siv-sigu2si','item-7865',3,3,3,NULL,NULL,30);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-6x6r6gx','siv-1pmiqbl','item-24696',20,20,20,NULL,NULL,30000);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-p67u5bd','siv-t3guj77','item-5675',10,10,10,NULL,NULL,1099);
INSERT INTO "StockIssueLine" ("id","issueId","itemId","quantityRequested","quantityApproved","quantityIssued","batchId","storageLocationId","unitPrice") VALUES('isline-w1o9mbs','siv-1nq5ldi','item-4634',3,3,3,NULL,NULL,5000);
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
INSERT INTO "ItemReturn" ("id","returnNumber","departmentId","returnedById","reason","status","remarks","createdAt","updatedAt") VALUES('ret-f1bm3dw','RET-108747','dept-adm','usr-req','Defective / Damaged','ACCEPTED',NULL,'2026-09-21 15:55:08','2026-09-21 15:56:19');
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
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-jtgwv00','item-123','batch-icce4gl','store-main','loc-01','RECEIPT',45,0,45,3500,'ALLOCATION','fgbh',NULL,NULL,'2026-09-19 18:23:26');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-6ag2e3i','item-screw',NULL,NULL,NULL,'ISSUE',0,5,35,0,'SIV','SIV-812120',NULL,NULL,'2026-09-19 20:30:56');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-c8u8v1u','item-123',NULL,NULL,NULL,'ISSUE',0,1,44,0,'SIV','SIV-238588',NULL,NULL,'2026-09-19 20:32:55');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-rdfjokf','item-7865','batch-3uqxoqe','store-main','loc-01','RECEIPT',1,0,1,30,'ALLOCATION','111222332',NULL,NULL,'2026-09-20 10:41:26');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-sq9moc7','item-7865','batch-3uqxoqe','store-main','loc-01','RECEIPT',49,0,50,30,'ALLOCATION','111222332',NULL,NULL,'2026-09-20 10:42:30');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-ljf30vz','item-23445',NULL,NULL,NULL,'ISSUE',0,10,0,0,'SIV','SIV-076661',NULL,NULL,'2026-09-20 10:45:49');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-vm9ht07','item-7865',NULL,NULL,NULL,'ISSUE',0,3,47,30,'SIV','SIV-242095',NULL,NULL,'2026-09-20 10:47:43');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-n0vwzh4','item-24696','batch-l5pwlhz','store-main','loc-01','RECEIPT',1,0,1,30000,'ALLOCATION','hou55',NULL,NULL,'2026-09-20 18:46:05');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-74djmtv','item-24696','batch-l5pwlhz','store-gen','loc-04','RECEIPT',500,0,501,30000,'ALLOCATION','hou55',NULL,NULL,'2026-09-20 18:47:25');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-eb4469j','item-24696',NULL,NULL,NULL,'ISSUE',0,20,481,30000,'SIV','SIV-380646',NULL,NULL,'2026-09-20 18:54:33');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-0tptdpe','item-5675','batch-vrecopd','store-gen','loc-04','RECEIPT',50,0,50,1099,'ALLOCATION','pppp',NULL,NULL,'2026-09-20 19:01:58');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-h0hrb0g','item-5675',NULL,NULL,NULL,'ISSUE',0,10,40,1099,'SIV','SIV-010960',NULL,NULL,'2026-09-20 19:05:41');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-k3mpzzk','item-4634','batch-frqma5r','store-main','loc-01','RECEIPT',15,0,15,5000,'ALLOCATION','567346',NULL,NULL,'2026-09-21 15:47:31');
INSERT INTO "StockLedgerEntry" ("id","itemId","batchId","storeId","storageLocationId","entryType","quantityIn","quantityOut","balanceAfter","unitPrice","referenceType","referenceId","remarks","createdById","createdAt") VALUES('led-hsh34nx','item-4634',NULL,NULL,NULL,'ISSUE',0,3,12,5000,'SIV','SIV-829125',NULL,NULL,'2026-09-21 15:52:33');
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "AuditLog" ("id","action","entity","entityId","userId","details","createdAt") VALUES('aud-asu2jtl','disposal.approve','StockDisposal','disp-seed-01','usr-admin','','2026-09-25T16:01:30.172Z');
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
INSERT INTO "PhysicalCount" ("id","countNumber","storeId","status","conductedById","reconciledById","remarks","createdAt","updatedAt") VALUES('cnt-ytr07ve','CNT-239192','store-main','OPEN','usr-store',NULL,NULL,'2026-09-21 15:57:19','2026-09-21 15:57:19');
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
INSERT INTO "StockDisposal" ("id","disposalNumber","itemId","batchId","quantity","reasonId","status","approvedById","remarks","createdAt","updatedAt") VALUES('disp-q62tna9','DSP-306357','item-123',NULL,10,'disp-01','APPROVED','usr-app',NULL,'2026-09-21 15:58:26','2026-09-21 15:59:25');
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
CREATE TABLE IF NOT EXISTS "Inspection" (
    "id" TEXT PRIMARY KEY,
    "grnLineId" TEXT NOT NULL,
    "quantityVerified" REAL NOT NULL DEFAULT 0,
    "quantityAccepted" REAL NOT NULL DEFAULT 0,
    "quantityRejected" REAL NOT NULL DEFAULT 0,
    "qualityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "Inspection" ("id","grnLineId","quantityVerified","quantityAccepted","quantityRejected","qualityStatus","outcome","notes","rejectionReason","createdAt","updatedAt") VALUES('insp-wcl2brn','line-9qxwxac',45,45,0,'PASS','ACCEPTED','Accepted from operational UI',NULL,'2026-09-19 18:19:53','2026-09-19 18:19:53');
INSERT INTO "Inspection" ("id","grnLineId","quantityVerified","quantityAccepted","quantityRejected","qualityStatus","outcome","notes","rejectionReason","createdAt","updatedAt") VALUES('insp-u4hm56e','line-s5l578b',50,50,0,'PASS','ACCEPTED','Accepted from operational UI',NULL,'2026-09-20 10:40:25','2026-09-20 10:40:25');
INSERT INTO "Inspection" ("id","grnLineId","quantityVerified","quantityAccepted","quantityRejected","qualityStatus","outcome","notes","rejectionReason","createdAt","updatedAt") VALUES('insp-k55y5u9','line-x728uc5',700,700,0,'PASS','ACCEPTED','Accepted from operational UI',NULL,'2026-09-20 18:41:44','2026-09-20 18:41:44');
INSERT INTO "Inspection" ("id","grnLineId","quantityVerified","quantityAccepted","quantityRejected","qualityStatus","outcome","notes","rejectionReason","createdAt","updatedAt") VALUES('insp-9bvlcdh','line-lund42q',50,50,0,'PASS','ACCEPTED','Accepted from operational UI',NULL,'2026-09-20 18:59:54','2026-09-20 18:59:54');
INSERT INTO "Inspection" ("id","grnLineId","quantityVerified","quantityAccepted","quantityRejected","qualityStatus","outcome","notes","rejectionReason","createdAt","updatedAt") VALUES('insp-plx2n0l','line-8b626xv',15,15,0,'PASS','ACCEPTED','Accepted from operational UI',NULL,'2026-09-21 15:45:59','2026-09-21 15:45:59');
