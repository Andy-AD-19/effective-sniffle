-- CreateTable
CREATE TABLE ItemReturn (
    id TEXT NOT NULL PRIMARY KEY,
    returnNumber TEXT NOT NULL,
    issueRequestId TEXT,
    voucherId TEXT,
    departmentId TEXT,
    returnedById TEXT NOT NULL,
    reason TEXT NOT NULL,
    conditionNotes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_INSPECTION',
    returnedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT ItemReturn_issueRequestId_fkey FOREIGN KEY (issueRequestId) REFERENCES IssueRequest (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ItemReturn_voucherId_fkey FOREIGN KEY (voucherId) REFERENCES StoreIssueVoucher (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ItemReturn_departmentId_fkey FOREIGN KEY (departmentId) REFERENCES Department (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ItemReturn_returnedById_fkey FOREIGN KEY (returnedById) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE ItemReturnLine (
    id TEXT NOT NULL PRIMARY KEY,
    returnId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    batchId TEXT,
    batchNumber TEXT,
    storageLocationId TEXT,
    quantityReturned DECIMAL NOT NULL,
    quantityAccepted DECIMAL DEFAULT 0,
    quantityRejected DECIMAL DEFAULT 0,
    conditionNotes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_INSPECTION',
    CONSTRAINT ItemReturnLine_returnId_fkey FOREIGN KEY (returnId) REFERENCES ItemReturn (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ItemReturnLine_itemId_fkey FOREIGN KEY (itemId) REFERENCES Item (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ItemReturnLine_batchId_fkey FOREIGN KEY (batchId) REFERENCES StockBatch (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ItemReturnLine_storageLocationId_fkey FOREIGN KEY (storageLocationId) REFERENCES StorageLocation (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE ReturnInspection (
    id TEXT NOT NULL PRIMARY KEY,
    returnId TEXT NOT NULL,
    returnLineId TEXT,
    outcome TEXT NOT NULL,
    qualityStatus TEXT NOT NULL DEFAULT 'PASS',
    quantityInspected DECIMAL NOT NULL,
    quantityAccepted DECIMAL NOT NULL DEFAULT 0,
    quantityRejected DECIMAL NOT NULL DEFAULT 0,
    targetStoreId TEXT,
    targetStorageLocationId TEXT,
    rejectionReason TEXT,
    remarks TEXT,
    inspectedById TEXT NOT NULL,
    inspectedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReturnInspection_returnId_fkey FOREIGN KEY (returnId) REFERENCES ItemReturn (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ReturnInspection_returnLineId_fkey FOREIGN KEY (returnLineId) REFERENCES ItemReturnLine (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ReturnInspection_targetStoreId_fkey FOREIGN KEY (targetStoreId) REFERENCES StoreLocation (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ReturnInspection_targetStorageLocationId_fkey FOREIGN KEY (targetStorageLocationId) REFERENCES StorageLocation (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT ReturnInspection_inspectedById_fkey FOREIGN KEY (inspectedById) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX ItemReturn_returnNumber_key ON ItemReturn(returnNumber);

-- CreateIndex
CREATE INDEX ItemReturn_status_idx ON ItemReturn(status);

-- CreateIndex
CREATE INDEX ItemReturn_returnedAt_idx ON ItemReturn(returnedAt);

-- CreateIndex
CREATE INDEX ReturnInspection_returnId_idx ON ReturnInspection(returnId);

-- CreateIndex
CREATE INDEX ReturnInspection_inspectedAt_idx ON ReturnInspection(inspectedAt);
