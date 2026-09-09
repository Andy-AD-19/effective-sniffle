-- FMOH Institutional Inventory - Cloudflare D1 Initial Seed Data
INSERT OR IGNORE INTO "Department" ("id", "name", "code", "active") VALUES
('dept-log', 'Logistics', 'LOG', 1),
('dept-adm', 'Administration', 'ADM', 1),
('dept-pha', 'Pharmacy & Medical Supplies', 'PHA', 1),
('dept-lab', 'Laboratory Services', 'LAB', 1),
('dept-eng', 'Biomedical Engineering', 'ENG', 1);

INSERT OR IGNORE INTO "Category" ("id", "name", "description", "active") VALUES
('cat-med', 'Pharmaceuticals & Medicines', 'Essential medicines and clinical pharmaceuticals', 1),
('cat-sup', 'Medical Supplies', 'Consumable clinical supplies and surgical disposables', 1),
('cat-lab', 'Laboratory Reagents', 'Diagnostic test kits and reagents', 1),
('cat-off', 'Office Supplies', 'Administrative consumables and stationeries', 1),
('cat-eqp', 'Medical Equipment', 'Durable medical and hospital devices', 1);

INSERT OR IGNORE INTO "UnitOfMeasure" ("id", "name", "symbol") VALUES
('unit-box', 'Box', 'box'),
('unit-pack', 'Pack', 'pack'),
('unit-ea', 'Each', 'ea'),
('unit-vial', 'Vial', 'vial'),
('unit-bottle', 'Bottle', 'btl'),
('unit-kit', 'Kit', 'kit');

INSERT OR IGNORE INTO "FundingSource" ("id", "name", "active") VALUES
('fund-gov', 'Government Treasury Allocation', 1),
('fund-glo', 'Global Fund Grant', 1),
('fund-usa', 'USAID / PEPFAR', 1),
('fund-who', 'WHO Emergency Relief', 1),
('fund-don', 'Direct Institutional Donation', 1);

INSERT OR IGNORE INTO "StoreLocation" ("id", "name", "code", "active") VALUES
('store-main', 'Central Medical Store', 'MAIN', 1),
('store-cold', 'Cold Chain Facility', 'COLD', 1),
('store-pha', 'Emergency Pharmacy Store', 'EMRG', 1);

INSERT OR IGNORE INTO "StorageLocation" ("id", "storeId", "locationCode", "roomOrZone", "shelfNumber", "rackNumber", "binNumber", "description", "isActive") VALUES
('loc-01', 'store-main', 'MAIN-A1-01', 'Zone A', '1', 'R1', '01', 'Main Store, Zone A, Shelf 1, Bin 1', 1),
('loc-02', 'store-main', 'MAIN-A1-02', 'Zone A', '1', 'R1', '02', 'Main Store, Zone A, Shelf 1, Bin 2', 1),
('loc-03', 'store-cold', 'COLD-C1-01', 'Cold Room', '1', 'C1', '01', 'Cold Chain Room 1, Rack 1', 1),
('loc-04', 'store-pha', 'EMRG-E1-01', 'Emergency', '1', 'E1', '01', 'Emergency Pharmacy Bin 1', 1);

INSERT OR IGNORE INTO "SupplierDonor" ("id", "name", "type", "contact", "active") VALUES
('sup-01', 'National Pharmaceutical Supply Agency', 'GOVERNMENT_SUPPLIER', 'contact@epss.gov.et', 1),
('sup-02', 'UNICEF Supply Division', 'DONOR', 'supply@unicef.org', 1),
('sup-03', 'Global Health Logistics Ltd', 'VENDOR', 'sales@ghlogistics.com', 1);

INSERT OR IGNORE INTO "DisposalReason" ("id", "name", "description", "active") VALUES
('disp-01', 'Expired', 'Past manufacturer expiration date', 1),
('disp-02', 'Damaged', 'Physical damage during transit or storage', 1),
('disp-03', 'Broken', 'Non-functional or broken equipment', 1),
('disp-04', 'Contaminated', 'Compromised packaging or sterility', 1),
('disp-05', 'Obsolete', 'Decommissioned or superseded item', 1),
('disp-06', 'Recalled', 'Manufacturer or regulatory batch recall', 1),
('disp-07', 'Other', 'Other documented institutional reason', 1);

-- Standard Seed Users (Password: Password123!)
-- Hash of 'Password123!' with bcrypt
INSERT OR IGNORE INTO "User" ("id", "email", "passwordHash", "fullName", "role", "departmentId", "active") VALUES
('usr-admin', 'admin@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Amina Yusuf (Admin)', 'SYSTEM_ADMINISTRATOR', 'dept-adm', 1),
('usr-store', 'storekeeper@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Musa Bello (Storekeeper)', 'STOREKEEPER', 'dept-log', 1),
('usr-req', 'requester@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Grace Okoro (Requester)', 'DEPARTMENT_USER', 'dept-adm', 1),
('usr-app', 'approver@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Samuel Adeyemi (Approver)', 'APPROVER', 'dept-log', 1),
('usr-insp', 'inspector@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Tadesse Bekele (Inspector)', 'INSPECTOR', 'dept-log', 1),
('usr-aud', 'auditor@fmoh.local', '$2b$10$tMh4zNfKqQ9xGk7tVf7JmOD8eYjM2K.f8J2H1WqfH6j1K1w.1aG2a', 'Nora Eze (Auditor)', 'VIEWER_AUDITOR', 'dept-adm', 1);

-- Sample Inventory Items
INSERT OR IGNORE INTO "Item" ("id", "code", "gtin", "description", "kind", "categoryId", "unitId", "defaultLocationId", "reorderLevel", "minimumStock", "maximumStock", "fundingSourceId", "batchTrackingRequired", "expiryTrackingRequired", "barcodeRequired", "active") VALUES
('item-amox', 'MED-AMOX-500', '08435123450012', 'Amoxicillin 500mg Capsules', 'CONSUMABLE', 'cat-med', 'unit-box', 'loc-01', 50, 20, 500, 'fund-gov', 1, 1, 1, 1),
('item-para', 'MED-PARA-500', '08435123450029', 'Paracetamol 500mg Tablets', 'CONSUMABLE', 'cat-med', 'unit-box', 'loc-01', 100, 50, 1000, 'fund-gov', 1, 1, 1, 1),
('item-syr', 'SUP-SYR-5ML', '08435123450036', 'Sterile Disposable Syringes 5ml with Needle', 'CONSUMABLE', 'cat-sup', 'unit-box', 'loc-02', 200, 100, 2000, 'fund-glo', 1, 0, 1, 1),
('item-gloves', 'SUP-GLV-EXAM', '08435123450043', 'Nitrile Examination Gloves Medium (Box of 100)', 'CONSUMABLE', 'cat-sup', 'unit-box', 'loc-02', 150, 50, 1500, 'fund-usa', 0, 0, 1, 1),
('item-oxim', 'EQP-PULSE-OX', '08435123450050', 'Handheld Digital Pulse Oximeter', 'FIXED_ASSET', 'cat-eqp', 'unit-ea', 'loc-01', 10, 5, 50, 'fund-who', 0, 0, 1, 1);
