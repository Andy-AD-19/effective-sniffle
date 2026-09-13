import { PrismaClient } from "d:/FMOH INVENTORY/node_modules/@prisma/client";

async function migrate() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "file:D:/FMOH INVENTORY/apps/api/prisma/data/fmoh-inventory.db"
      }
    }
  });

  console.log("=== STARTING MASTER DATA MIGRATION ===");

  // 1. Units of Measure
  const unitsToMigrate = [
    { name: "Bottle", symbol: "btl" },
    { name: "Box", symbol: "box" },
    { name: "Each", symbol: "ea" },
    { name: "Kit", symbol: "kit" },
    { name: "Pack", symbol: "pack" },
    { name: "Vial", symbol: "vial" },
    { name: "Set", symbol: "Set" },
    { name: "Piece", symbol: "pc" },
    { name: "Roll", symbol: "roll" }
  ];

  for (const u of unitsToMigrate) {
    const existing = await prisma.unitOfMeasure.findFirst({
      where: { OR: [{ symbol: u.symbol }, { name: u.name }] }
    });
    if (!existing) {
      const created = await prisma.unitOfMeasure.create({ data: u });
      console.log(`+ Created Unit: ${created.name} (${created.symbol})`);
    } else {
      console.log(`✓ Unit exists: ${existing.name} (${existing.symbol})`);
    }
  }

  // 2. Stores / StoreLocations
  const storesToMigrate = [
    { name: "Main Store", code: "MAIN", active: true },
    { name: "Central Medical Store", code: "CMS", active: true },
    { name: "Cold Chain Facility", code: "COLD", active: true },
    { name: "Emergency Pharmacy Store", code: "EMRG", active: true },
    { name: "Returned Items Location", code: "RETURNED", active: true }
  ];

  for (const s of storesToMigrate) {
    const existing = await prisma.storeLocation.findFirst({
      where: { OR: [{ code: s.code }, { name: s.name }] }
    });
    if (!existing) {
      const created = await prisma.storeLocation.create({ data: s });
      console.log(`+ Created Store: ${created.name} [${created.code}]`);
    } else {
      console.log(`✓ Store exists: ${existing.name} [${existing.code}]`);
    }
  }

  // 3. Categories
  const categoriesToMigrate = [
    { name: "Pharmaceuticals & Medicines", description: "Essential medicines and clinical pharmaceuticals", active: true },
    { name: "Medical Supplies", description: "Consumable clinical supplies and surgical disposables", active: true },
    { name: "Laboratory Reagents", description: "Diagnostic test kits and reagents", active: true },
    { name: "Office Supplies", description: "Administrative consumables and stationeries", active: true },
    { name: "Medical Equipment", description: "Durable medical and hospital devices", active: true },
    { name: "Equipment", description: "Fixed assets and durable goods", active: true },
    { name: "Manual Inventory Import", description: "Items imported from the 2018 MIHRET manual inventory workflow", active: true }
  ];

  for (const c of categoriesToMigrate) {
    const existing = await prisma.category.findUnique({ where: { name: c.name } });
    if (!existing) {
      const created = await prisma.category.create({ data: c });
      console.log(`+ Created Category: ${created.name}`);
    } else {
      console.log(`✓ Category exists: ${existing.name}`);
    }
  }

  // 4. Funding Sources
  const fundingToMigrate = [
    { name: "Government Treasury Allocation", active: true },
    { name: "Global Fund Grant", active: true },
    { name: "USAID / PEPFAR", active: true },
    { name: "WHO Emergency Relief", active: true },
    { name: "Direct Institutional Donation", active: true },
    { name: "Federal Allocation", active: true }
  ];

  for (const f of fundingToMigrate) {
    const existing = await prisma.fundingSource.findUnique({ where: { name: f.name } });
    if (!existing) {
      const created = await prisma.fundingSource.create({ data: f });
      console.log(`+ Created Funding Source: ${created.name}`);
    } else {
      console.log(`✓ Funding Source exists: ${existing.name}`);
    }
  }

  // 5. Departments
  const departmentsToMigrate = [
    { name: "Administration", code: "ADM", active: true },
    { name: "Logistics", code: "LOGI", active: true },
    { name: "Pharmacy & Medical Supplies", code: "PHA", active: true },
    { name: "Laboratory Services", code: "LAB", active: true },
    { name: "Biomedical Engineering", code: "ENG", active: true },
    { name: "Finance", code: "FIN", active: true }
  ];

  for (const d of departmentsToMigrate) {
    const existing = await prisma.department.findFirst({
      where: { OR: [{ code: d.code }, { name: d.name }] }
    });
    if (!existing) {
      const created = await prisma.department.create({ data: d });
      console.log(`+ Created Department: ${created.name} [${created.code}]`);
    } else {
      console.log(`✓ Department exists: ${existing.name} [${existing.code}]`);
    }
  }

  // 6. Suppliers / Donors
  const suppliersToMigrate = [
    { name: "National Pharmaceutical Supply Agency", type: "GOVERNMENT_SUPPLIER", contact: "contact@epss.gov.et", active: true },
    { name: "UNICEF Supply Division", type: "DONOR", contact: "supply@unicef.org", active: true },
    { name: "Global Health Logistics Ltd", type: "VENDOR", contact: "sales@ghlogistics.com", active: true },
    { name: "National Office Supplies", type: "PROCUREMENT", contact: "supplies@example.local", active: true }
  ];

  for (const s of suppliersToMigrate) {
    const existing = await prisma.supplierDonor.findFirst({ where: { name: s.name } });
    if (!existing) {
      const created = await prisma.supplierDonor.create({ data: s });
      console.log(`+ Created Supplier/Donor: ${created.name}`);
    } else {
      console.log(`✓ Supplier/Donor exists: ${existing.name}`);
    }
  }

  // 7. Disposal Reasons
  const disposalReasonsToMigrate = [
    { name: "Expired", description: "Past manufacturer expiration date", active: true },
    { name: "Damaged", description: "Physical damage during transit or storage", active: true },
    { name: "Broken", description: "Non-functional or broken equipment", active: true },
    { name: "Contaminated", description: "Compromised packaging or sterility", active: true },
    { name: "Obsolete", description: "Decommissioned or superseded item", active: true },
    { name: "Recalled", description: "Manufacturer or regulatory batch recall", active: true },
    { name: "Other", description: "Other documented institutional reason", active: true }
  ];

  for (const dr of disposalReasonsToMigrate) {
    const existing = await prisma.disposalReason.findUnique({ where: { name: dr.name } });
    if (!existing) {
      const created = await prisma.disposalReason.create({ data: dr });
      console.log(`+ Created Disposal Reason: ${created.name}`);
    } else {
      console.log(`✓ Disposal Reason exists: ${existing.name}`);
    }
  }

  const finalUnits = await prisma.unitOfMeasure.findMany();
  const finalStores = await prisma.storeLocation.findMany();
  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Total Units in DB: ${finalUnits.length}`);
  console.log(`Total Stores in DB: ${finalStores.length}`);

  await prisma.$disconnect();
}

migrate().catch(console.error);
