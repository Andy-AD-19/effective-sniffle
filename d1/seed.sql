-- FMOH Institutional Inventory - Cloudflare D1 Initial Seed Data (Institutional Logistics Domain)

-- 1. Departments
INSERT OR REPLACE INTO "Department" ("id", "name", "code", "active") VALUES
('dept-log', 'Logistics & Fleet Management', 'LOG', 1),
('dept-adm', 'General Administration', 'ADM', 1),
('dept-pharm', 'Public Health Supply Chain', 'PHARM', 1),
('dept-lab', 'Diagnostic Infrastructure', 'LAB', 1),
('dept-eng', 'Biomedical Engineering & Maintenance', 'ENG', 1);

-- 2. Institutional Categories
INSERT OR REPLACE INTO "Category" ("id", "name", "description", "active") VALUES
('cat-veh', 'Vehicles & Fleet Management', 'Field ambulances, utility vehicles, transport trucks, and motorcycles', 1),
('cat-eqp', 'Facility & Medical Heavy Equipment', 'Standby generators, cold chain solar refrigerators, incinerators, and sterilizers', 1),
('cat-fur', 'Office & Facility Furniture', 'Examination beds, patient ward furniture, administrative desks, and storage racks', 1),
('cat-it', 'IT & Office Automation', 'Workstations, network servers, institutional laptops, and backup UPS units', 1),
('cat-sup', 'General Maintenance & Operational Supplies', 'Toolkits, technical spare parts, facility consumables, and cleaning supplies', 1);

-- 3. Units of Measure
INSERT OR REPLACE INTO "UnitOfMeasure" ("id", "name", "symbol") VALUES
('unit-ea', 'Each / Unit', 'ea'),
('unit-set', 'Complete Set / Kit', 'set'),
('unit-box', 'Carton / Box', 'box'),
('unit-pack', 'Pack / Bundle', 'pack'),
('unit-pc', 'Piece', 'pc'),
('unit-roll', 'Roll', 'roll');

-- 4. Funding Sources
INSERT OR REPLACE INTO "FundingSource" ("id", "name", "active") VALUES
('fund-gov', 'Federal Government Capital Budget', 1),
('fund-glo', 'Global Fund Grant Assistance', 1),
('fund-usa', 'USAID Institutional Support', 1),
('fund-who', 'WHO Emergency & Disaster Relief', 1),
('fund-don', 'Direct Bilateral Donation', 1),
('fund-fed', 'Federal Ministry Special Allocation', 1);

-- 5. Store Locations
INSERT OR REPLACE INTO "StoreLocation" ("id", "name", "code", "active") VALUES
('store-main', 'Central Logistics & Technical Depot', 'MAIN', 1),
('store-fleet', 'Fleet Workshop & Motor Pool', 'FLEET', 1),
('store-cold', 'Cold Chain Logistics Facility', 'COLD', 1),
('store-asset', 'General Asset & Maintenance Warehouse', 'ASSET', 1);

-- 6. Storage Locations (Racks / Zones)
INSERT OR REPLACE INTO "StorageLocation" ("id", "storeId", "locationCode", "roomOrZone", "shelfNumber", "rackNumber", "binNumber", "description", "isActive") VALUES
('loc-01', 'store-main', 'MAIN-TECH-A1', 'Zone A - Technical', '1', 'R1', '01', 'Technical Depot, Shelf 1, Bay 1', 1),
('loc-02', 'store-fleet', 'FLEET-BAY-01', 'Fleet Motor Pool', '0', 'B1', '01', 'Motor Pool Inspection Bay 1', 1),
('loc-03', 'store-cold', 'COLD-SOL-01', 'Cold Chain Annex', '1', 'C1', '01', 'Solar Cold Chain Bay 1', 1),
('loc-04', 'store-asset', 'ASSET-GEN-01', 'General Warehouse', '2', 'G1', '01', 'Heavy Asset Storage Bay 1', 1);

-- 7. Suppliers & Donors
INSERT OR REPLACE INTO "SupplierDonor" ("id", "name", "type", "contact", "active") VALUES
('sup-01', 'National Transport & Vehicle Supply Enterprise', 'GOVERNMENT_SUPPLIER', 'fleet-logistics@enterprise.gov.et', 1),
('sup-02', 'UNICEF Supply & Logistics Division', 'DONOR', 'supply@unicef.org', 1),
('sup-03', 'Federal Heavy Equipment & Power Solutions', 'VENDOR', 'contracts@powerequip.et', 1);

-- 8. Disposal Reasons
INSERT OR REPLACE INTO "DisposalReason" ("id", "name", "description", "active") VALUES
('disp-01', 'Decommissioned / End of Service Life', 'Asset has reached end of manufacturer economic service lifecycle', 1),
('disp-02', 'Damaged Beyond Economic Repair', 'Physical damage where repair cost exceeds residual asset value', 1),
('disp-03', 'Obsolete Technical Specification', 'Superseded by institutional technology standard', 1),
('disp-04', 'Total Constructive Loss', 'Accident or severe operational loss', 1),
('disp-05', 'Cannibalized for Spares', 'Parts harvested to sustain fleet or active equipment', 1),
('disp-06', 'Surplus / De-accessioning', 'Excess equipment identified during annual audit', 1);

-- 9. Seed Users (Password: Password123!)
INSERT OR REPLACE INTO "User" ("id", "email", "passwordHash", "fullName", "role", "departmentId", "active") VALUES
('usr-admin', 'admin@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Amina Yusuf (Admin)', 'SYSTEM_ADMINISTRATOR', 'dept-adm', 1),
('usr-store', 'storekeeper@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Musa Bello (Storekeeper)', 'STOREKEEPER', 'dept-log', 1),
('usr-req', 'requester@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Grace Okoro (Requester)', 'DEPARTMENT_USER', 'dept-adm', 1),
('usr-app', 'approver@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Samuel Adeyemi (Approver)', 'APPROVER', 'dept-log', 1),
('usr-insp', 'inspector@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Tadesse Bekele (Inspector)', 'INSPECTOR', 'dept-log', 1),
('usr-aud', 'auditor@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Nora Eze (Auditor)', 'VIEWER_AUDITOR', 'dept-adm', 1);

-- 10. Institutional Inventory Items
INSERT OR REPLACE INTO "Item" ("id", "code", "gtin", "description", "kind", "categoryId", "unitId", "defaultLocationId", "reorderLevel", "minimumStock", "maximumStock", "fundingSourceId", "batchTrackingRequired", "expiryTrackingRequired", "barcodeRequired", "active") VALUES
('item-amb-01', 'VEH-AMB-01', '08435123450101', 'Toyota Land Cruiser 4WD Field Ambulance', 'FIXED_ASSET', 'cat-veh', 'unit-ea', 'loc-02', 2, 1, 10, 'fund-gov', 1, 0, 1, 1),
('item-mtc-02', 'VEH-MTC-02', '08435123450102', 'Yamaha AG200 Field Inspection Motorcycle', 'FIXED_ASSET', 'cat-veh', 'unit-ea', 'loc-02', 5, 2, 25, 'fund-usa', 1, 0, 1, 1),
('item-gen-15kva', 'EQP-GEN-15KVA', '08435123450103', '15kVA Standby Diesel Generator Set', 'FIXED_ASSET', 'cat-eqp', 'unit-ea', 'loc-01', 2, 1, 8, 'fund-gov', 1, 0, 1, 1),
('item-ref-sdd', 'EQP-REF-SDD', '08435123450104', 'Solar Direct Drive Cold Chain Vaccine Refrigerator', 'FIXED_ASSET', 'cat-eqp', 'unit-ea', 'loc-03', 3, 1, 15, 'fund-glo', 1, 0, 1, 1),
('item-bed-hyd', 'FUR-BED-HYD', '08435123450105', 'Adjustable Hydraulic Examination Bed', 'FIXED_ASSET', 'cat-fur', 'unit-ea', 'loc-04', 10, 5, 40, 'fund-gov', 0, 0, 1, 1),
('item-tool-mnt', 'SUP-TOOL-MNT', '08435123450106', 'Heavy-Duty Screwdriver & Maintenance Toolkit', 'CONSUMABLE', 'cat-sup', 'unit-set', 'loc-01', 15, 5, 60, 'fund-fed', 0, 0, 1, 1),
('item-screw', '2', '08435123450107', 'Screw driver', 'CONSUMABLE', 'cat-sup', 'unit-pc', 'loc-01', 20, 10, 100, 'fund-gov', 1, 0, 1, 1);

-- 11. Initial Batches
INSERT OR REPLACE INTO "StockBatch" ("id", "itemId", "grnLineId", "batchNumber", "expiryDate", "unitCost", "fundingSourceId", "totalAcceptedQuantity", "remainingQuantity", "status") VALUES
('batch-amb-01', 'item-amb-01', 'grnline-init-1', 'FLEET-2026-01', '', 85000.0, 'fund-gov', 4, 1, 'AVAILABLE'),
('batch-gen-01', 'item-gen-15kva', 'grnline-init-2', 'EQP-2026-01', '', 12500.0, 'fund-gov', 5, 2, 'AVAILABLE'),
('batch-screw-01', 'item-screw', 'grnline-init-3', 'MNT-2026-01', '', 18.5, 'fund-gov', 50, 40, 'AVAILABLE');

-- 12. Stock Location Balances
INSERT OR REPLACE INTO "StockLocationBalance" ("id", "itemId", "batchId", "storeId", "storageLocationId", "quantityOnHand", "quantityReserved", "quantityAvailable") VALUES
('bal-01', 'item-amb-01', 'batch-amb-01', 'store-fleet', 'loc-02', 4, 0, 4),
('bal-02', 'item-gen-15kva', 'batch-gen-01', 'store-main', 'loc-01', 5, 0, 5),
('bal-03', 'item-screw', 'batch-screw-01', 'store-main', 'loc-01', 40, 0, 40);

-- 13. Stock Ledger Entries
INSERT OR REPLACE INTO "StockLedgerEntry" ("id", "itemId", "batchId", "entryType", "quantityIn", "quantityOut", "balanceAfter", "unitPrice", "referenceType", "referenceId") VALUES
('led-init-1', 'item-amb-01', 'batch-amb-01', 'RECEIPT', 4, 0, 4, 85000.0, 'GRN', 'GRN-FLEET-001'),
('led-init-2', 'item-screw', 'batch-screw-01', 'RECEIPT', 50, 10, 40, 18.5, 'GRN', 'GRN-MNT-002');

-- 14. Seed Workflow Items (Pending Approval)
INSERT OR REPLACE INTO "StockIssueVoucher" ("id", "sivNumber", "departmentId", "recipientName", "purpose", "createdById", "status") VALUES
('siv-seed-01', 'SIV-2026-001', 'dept-eng', 'Eng. Samuel K.', 'Urgent facility generator repair and maintenance', 'usr-store', 'PENDING_APPROVAL');

INSERT OR REPLACE INTO "StockIssueLine" ("id", "issueId", "itemId", "quantityRequested", "quantityApproved", "quantityIssued", "unitPrice") VALUES
('isline-seed-1', 'siv-seed-01', 'item-screw', 5, 0, 0, 18.5);

INSERT OR REPLACE INTO "StockAdjustment" ("id", "adjustmentNumber", "itemId", "batchId", "quantityDelta", "reason", "approvedById") VALUES
('adj-seed-01', 'ADJ-2026-001', 'item-gen-15kva', 'batch-gen-01', 1, 'Found during annual inventory count reconciliation', NULL);

INSERT OR REPLACE INTO "StockDisposal" ("id", "disposalNumber", "itemId", "batchId", "quantity", "reasonId", "status") VALUES
('disp-seed-01', 'DSP-2026-001', 'item-screw', 'batch-screw-01', 2, 'disp-03', 'PENDING_APPROVAL');
