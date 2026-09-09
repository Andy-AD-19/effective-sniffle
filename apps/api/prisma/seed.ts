import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ItemKind, LedgerEntryType, RoleName, StockSourceType } from "../src/modules/domain/prisma-enums";
import { configureSqliteDatabaseUrl } from "../src/modules/prisma/sqlite-url";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  let logistics = await prisma.department.findFirst({ where: { OR: [{ code: "LOG" }, { name: "Logistics" }] } });
  if (!logistics) {
    logistics = await prisma.department.create({ data: { code: "LOG", name: "Logistics" } });
  }
  let administration = await prisma.department.findFirst({ where: { OR: [{ code: "ADM" }, { name: "Administration" }] } });
  if (!administration) {
    administration = await prisma.department.create({ data: { code: "ADM", name: "Administration" } });
  }

  const users = [
    ["admin@example.com", "Default Administrator", RoleName.SYSTEM_ADMINISTRATOR, null],
    ["admin@fmoh.local", "Amina Yusuf", RoleName.SYSTEM_ADMINISTRATOR, null],
    ["storekeeper@fmoh.local", "Musa Bello", RoleName.STOREKEEPER, logistics.id],
    ["requester@fmoh.local", "Grace Okoro", RoleName.DEPARTMENT_USER, administration.id],
    ["approver@fmoh.local", "Samuel Adeyemi", RoleName.APPROVER, logistics.id],
    ["inspector@fmoh.local", "Tadesse Bekele", RoleName.INSPECTOR, logistics.id],
    ["auditor@fmoh.local", "Nora Eze", RoleName.VIEWER_AUDITOR, null]
  ] as const;

  for (const [email, fullName, role, departmentId] of users) {
    const userPasswordHash = await bcrypt.hash(email === "admin@example.com" ? "Admin12345!" : "Password123!", 10);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: userPasswordHash, role, fullName },
      create: { email, fullName, role, departmentId, passwordHash: userPasswordHash }
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@fmoh.local" } });
  const storekeeper = await prisma.user.findUniqueOrThrow({ where: { email: "storekeeper@fmoh.local" } });
  const officeSupplies = await prisma.category.upsert({
    where: { name: "Office Supplies" },
    update: {},
    create: { name: "Office Supplies", description: "Consumable office and institutional supplies" }
  });
  const equipment = await prisma.category.upsert({
    where: { name: "Equipment" },
    update: {},
    create: { name: "Equipment", description: "Fixed assets and durable goods" }
  });
  const pack = await prisma.unitOfMeasure.upsert({
    where: { symbol: "pack" },
    update: {},
    create: { name: "Pack", symbol: "pack" }
  });
  const each = await prisma.unitOfMeasure.upsert({
    where: { symbol: "ea" },
    update: {},
    create: { name: "Each", symbol: "ea" }
  });
  const source = await prisma.fundingSource.upsert({
    where: { name: "Federal Allocation" },
    update: {},
    create: { name: "Federal Allocation" }
  });
  for (const [name, description] of [
    ["Expired", "Past expiry date or no longer safe to use."],
    ["Damaged", "Physically damaged stock."],
    ["Broken", "Broken equipment or supplies."],
    ["Contaminated", "Contaminated or compromised stock."],
    ["Obsolete", "No longer required or superseded."],
    ["Recalled", "Recalled by supplier, manufacturer, or authority."],
    ["Other", "Other documented disposal reason."]
  ] as const) {
    await prisma.disposalReason.upsert({
      where: { name },
      update: { description, active: true },
      create: { name, description }
    });
  }
  const store = await prisma.storeLocation.upsert({
    where: { code: "MAIN" },
    update: { name: "Main Store" },
    create: { code: "MAIN", name: "Main Store" }
  });
  const storageLocation = await prisma.storageLocation.upsert({
    where: { locationCode: "STORE-A-S2-B5" },
    update: {},
    create: {
      storeId: store.id,
      locationCode: "STORE-A-S2-B5",
      roomOrZone: "Store A",
      shelfNumber: "2",
      rackNumber: "R1",
      binNumber: "5",
      description: "Store A, Shelf 2, Bin 5"
    }
  });

  const returnedStore = await prisma.storeLocation.upsert({
    where: { code: "RETURNED" },
    update: { name: "Returned Items Location" },
    create: { code: "RETURNED", name: "Returned Items Location" }
  });
  await prisma.storageLocation.upsert({
    where: { locationCode: "RET-HOLDING-01" },
    update: {},
    create: {
      storeId: returnedStore.id,
      locationCode: "RET-HOLDING-01",
      roomOrZone: "Returns Holding",
      shelfNumber: "R1",
      rackNumber: "R-RET",
      binNumber: "HOLD",
      description: "Dedicated holding location for returned items pending inspection"
    }
  });

  const printerPaper = await prisma.item.upsert({
    where: { code: "ITM-0001" },
    update: {
      description: "A4 printer paper ream",
      kind: ItemKind.CONSUMABLE,
      categoryId: officeSupplies.id,
      unitId: pack.id,
      defaultLocationId: store.id,
      fundingSourceId: source.id
    },
    create: {
      code: "ITM-0001",
      description: "A4 printer paper ream",
      kind: ItemKind.CONSUMABLE,
      categoryId: officeSupplies.id,
      unitId: pack.id,
      defaultLocationId: store.id,
      reorderLevel: 120,
      minimumStock: 80,
      maximumStock: 1000,
      fundingSourceId: source.id
    }
  });
  const microscope = await prisma.item.upsert({
    where: { code: "EQP-0001" },
    update: {},
    create: {
      code: "EQP-0001",
      description: "Binocular laboratory microscope",
      kind: ItemKind.FIXED_ASSET,
      categoryId: equipment.id,
      unitId: each.id,
      defaultLocationId: store.id,
      reorderLevel: 2,
      minimumStock: 1,
      maximumStock: 10,
      fundingSourceId: source.id
    }
  });

  const supplier = await prisma.supplierDonor.upsert({
    where: { id: "seed-supplier" },
    update: { name: "National Office Supplies" },
    create: {
      id: "seed-supplier",
      name: "National Office Supplies",
      type: StockSourceType.PROCUREMENT,
      contact: "supplies@example.local"
    }
  });

  const grn = await prisma.goodsReceivingNote.upsert({
    where: { grnNumber: "GRN-2026-000001" },
    update: {},
    create: {
      grnNumber: "GRN-2026-000001",
      sourceType: StockSourceType.PROCUREMENT,
      purchaseOrderRef: "PO-2026-001",
      deliveryNoteRef: "DN-44321",
      supplierDonorId: supplier.id,
      createdById: storekeeper.id,
      lines: {
        create: [
          {
            itemId: printerPaper.id,
            quantityReceived: 500,
            unitPrice: 1.25,
            batchNumber: "PAPER-2601",
            expiryDate: new Date("2029-12-31")
          },
          {
            itemId: microscope.id,
            quantityReceived: 4,
            unitPrice: 650,
            batchNumber: "MIC-2026-A",
            expiryDate: new Date("2031-12-31")
          }
        ]
      }
    },
    include: { lines: true }
  });

  for (const line of grn.lines) {
    const accepted = line.itemId === printerPaper.id ? 480 : 4;
    const rejected = Number(line.quantityReceived) - accepted;
    await prisma.inspection.upsert({
      where: { grnLineId: line.id },
      update: {},
      create: {
        grnLineId: line.id,
        quantityVerified: line.quantityReceived,
        quantityAccepted: accepted,
        quantityRejected: rejected,
        outcome: rejected > 0 ? "PARTIALLY_ACCEPTED" : "ACCEPTED",
        qualityNotes: rejected > 0 ? "Some packs damaged at delivery." : "Accepted in good condition.",
        rejectionReason: rejected > 0 ? "Damaged packaging" : null,
        storeLocationId: store.id,
        shelfCode: "A1",
        binCode: line.itemId === printerPaper.id ? "B01" : "B02",
        barcode: `FMOH-${line.id.slice(-8)}`,
        inspectedById: storekeeper.id
      }
    });
    const batch = await prisma.stockBatch.upsert({
      where: { barcodeValue: `SEED-BAR-${line.id.slice(-8)}` },
      update: {},
      create: {
        itemId: line.itemId,
        grnLineId: line.id,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        receivedDate: grn.receivedAt,
        unitCost: line.unitPrice,
        fundingSourceId: source.id,
        sourceReference: grn.grnNumber,
        totalAcceptedQuantity: accepted,
        remainingQuantity: 0,
        barcodeValue: `SEED-BAR-${line.id.slice(-8)}`,
        qrCodeValue: `SEED-QR-${line.id.slice(-8)}`,
        status: "AVAILABLE"
      }
    });
    const balance = await prisma.stockLocationBalance.upsert({
      where: { batchId_storageLocationId: { batchId: batch.id, storageLocationId: storageLocation.id } },
      update: {},
      create: {
        itemId: line.itemId,
        batchId: batch.id,
        storeId: store.id,
        storageLocationId: storageLocation.id,
        quantityOnHand: accepted,
        quantityAvailable: accepted
      }
    });
    await prisma.stockLedgerEntry.upsert({
      where: { entryNumber: `LED-2026-SEED-${line.id.slice(-6)}` },
      update: {
        batchId: batch.id,
        storageLocationId: storageLocation.id,
        storeLocationId: store.id,
        shelfCode: storageLocation.shelfNumber,
        binCode: storageLocation.binNumber,
        sourceEntity: "StockLocationBalance",
        sourceId: balance.id,
        notes: "Seed storage allocation receipt"
      },
      create: {
        entryNumber: `LED-2026-SEED-${line.id.slice(-6)}`,
        type: LedgerEntryType.RECEIPT,
        itemId: line.itemId,
        quantity: accepted,
        unitCost: line.unitPrice,
        batchId: batch.id,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        storeLocationId: store.id,
        storageLocationId: storageLocation.id,
        shelfCode: storageLocation.shelfNumber,
        binCode: storageLocation.binNumber,
        sourceEntity: "StockLocationBalance",
        sourceId: balance.id,
        grnLineId: line.id,
        actorId: storekeeper.id,
        notes: "Seed storage allocation receipt"
      }
    });
    await prisma.barcodeQRCode.upsert({
      where: { value: `SEED-QR-${line.id.slice(-8)}-LOC` },
      update: {},
      create: {
        batchId: batch.id,
        locationBalanceId: balance.id,
        storageLocationId: storageLocation.id,
        format: "QR_CODE",
        value: `SEED-QR-${line.id.slice(-8)}-LOC`,
        payload: JSON.stringify({
          itemId: line.itemId,
          batchNumber: line.batchNumber,
          store: store.name,
          shelfNumber: storageLocation.shelfNumber,
          binLocation: storageLocation.binNumber,
          quantity: accepted
        })
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.completed",
      entityType: "System",
      after: JSON.stringify({ message: "Seed data installed" })
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
