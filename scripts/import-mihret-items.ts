import ExcelJS from "exceljs";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../apps/api/src/modules/prisma/sqlite-url";
import { ItemKind } from "../apps/api/src/modules/domain/prisma-enums";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

type SeedItem = {
  sourceRow?: number;
  serial?: string;
  code: string;
  description: string;
  partNumber?: string | null;
  unit: { symbol: string; name: string };
  finalReportQuantity?: number;
  physicalBalance?: number;
  unitPrice?: number;
  sourceOfFund?: string | null;
  categoryName?: string;
  categoryDescription?: string;
  kind?: string;
  defaultStoreCode?: string;
  defaultStoreName?: string;
  fundingSourceName?: string;
  reorderLevel?: number;
  minimumStock?: number;
  maximumStock?: number;
  batchTrackingRequired?: boolean;
  expiryTrackingRequired?: boolean;
  barcodeRequired?: boolean;
  active?: boolean;
  needsParameterReview?: boolean;
};

const defaultSeedPath = "apps/api/prisma/data/mihret-items.seed.json";
const inputPath = process.argv[2] ?? defaultSeedPath;

function text(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanCode(raw: string, fallback: string) {
  if (!raw || /^none$/i.test(raw) || /^n\/a$/i.test(raw)) return fallback;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9._/-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function normalizeUnit(raw: string) {
  const value = raw.trim();
  if (/^each$/i.test(value)) return { symbol: "ea", name: "Each" };
  if (/^pcs?$/i.test(value)) return { symbol: "pc", name: "Piece" };
  if (/^packs?$/i.test(value)) return { symbol: "pack", name: "Pack" };
  return { symbol: value || "ea", name: value || "Each" };
}

function uniqueCode(base: string, usedCodes: Set<string>) {
  let code = base.slice(0, 48);
  let suffix = 2;
  while (usedCodes.has(code)) {
    code = `${base.slice(0, 43)}-${suffix}`;
    suffix += 1;
  }
  usedCodes.add(code);
  return code;
}

async function loadSeedItems(path: string): Promise<{ items: SeedItem[]; source: string; skippedRows?: number }> {
  const resolved = resolve(path);
  if (!existsSync(resolved)) throw new Error(`MIHRET seed source was not found: ${resolved}`);
  if (extname(resolved).toLowerCase() === ".json") {
    const payload = JSON.parse(readFileSync(resolved, "utf8"));
    if (!Array.isArray(payload.items)) throw new Error("MIHRET seed JSON must contain an items array.");
    return { items: payload.items, source: resolved, skippedRows: payload.skippedRows };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolved);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook has no sheets");
  const usedCodes = new Set<string>();
  const seenBaseCodes = new Set<string>();
  const items: SeedItem[] = [];
  let skippedRows = 0;

  for (let rowNumber = 17; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const serial = text(row.getCell(1).value);
    const description = text(row.getCell(2).value);
    if (!/^\d+$/.test(serial) || !description || /^total\b/i.test(description)) {
      skippedRows += 1;
      continue;
    }
    const partNumber = text(row.getCell(3).value);
    const unit = normalizeUnit(text(row.getCell(4).value));
    const finalReportQuantity = numberValue(row.getCell(5).value);
    const physicalBalance = numberValue(row.getCell(11).value);
    const unitPrice = numberValue(row.getCell(13).value);
    const sourceOfFund = text(row.getCell(15).value);
    const fallbackCode = `MIHRET-${String(serial).padStart(4, "0")}`;
    const baseCode = cleanCode(partNumber || serial, fallbackCode);
    const candidateCode = seenBaseCodes.has(baseCode) ? `${baseCode}-${serial}` : baseCode;
    const code = uniqueCode(candidateCode, usedCodes);
    const levels = Math.max(finalReportQuantity, physicalBalance, 1);
    seenBaseCodes.add(baseCode);
    items.push({
      sourceRow: rowNumber,
      serial,
      code,
      description,
      partNumber: partNumber || null,
      unit,
      finalReportQuantity,
      physicalBalance,
      unitPrice,
      sourceOfFund: sourceOfFund || null,
      categoryName: "Manual Inventory Import",
      categoryDescription: "Items imported from the 2018 MIHRET manual inventory workflow",
      kind: ItemKind.GENERAL_SUPPLY,
      defaultStoreCode: "MAIN",
      defaultStoreName: "Main Store",
      fundingSourceName: sourceOfFund || "Federal Allocation",
      reorderLevel: 0,
      minimumStock: 0,
      maximumStock: levels,
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      active: true,
      needsParameterReview: !sourceOfFund || !partNumber || finalReportQuantity <= 0 || physicalBalance <= 0
    });
  }
  return { items, source: resolved, skippedRows };
}

async function main() {
  const { items, source, skippedRows } = await loadSeedItems(inputPath);
  const existingItems = await prisma.item.findMany({ select: { id: true, code: true } });
  const existingByCode = new Map(existingItems.map((item) => [item.code, item]));
  const categories = new Map<string, { id: string }>();
  const stores = new Map<string, { id: string }>();
  const fundingSources = new Map<string, { id: string }>();
  const units = new Map<string, { id: string }>();
  const auditRows: any[] = [];
  let imported = 0;

  await prisma.auditLog.deleteMany({ where: { action: "manual_inventory.seed_item" } });

  for (const seed of items) {
    const categoryName = seed.categoryName ?? "Manual Inventory Import";
    const storeCode = seed.defaultStoreCode ?? "MAIN";
    const fundingName = seed.fundingSourceName ?? "Federal Allocation";
    let category = categories.get(categoryName);
    if (!category) {
      category = await prisma.category.upsert({
        where: { name: categoryName },
        update: { active: true },
        create: {
          name: categoryName,
          description: seed.categoryDescription ?? "Items imported from the 2018 MIHRET manual inventory workflow"
        },
        select: { id: true }
      });
      categories.set(categoryName, category);
    }
    let store = stores.get(storeCode);
    if (!store) {
      store = await prisma.storeLocation.upsert({
        where: { code: storeCode },
        update: { name: seed.defaultStoreName ?? "Main Store", active: true },
        create: { code: storeCode, name: seed.defaultStoreName ?? "Main Store" },
        select: { id: true }
      });
      stores.set(storeCode, store);
    }
    let funding = fundingSources.get(fundingName);
    if (!funding) {
      funding = await prisma.fundingSource.upsert({
        where: { name: fundingName },
        update: { active: true },
        create: { name: fundingName },
        select: { id: true }
      });
      fundingSources.set(fundingName, funding);
    }
    let unit = units.get(seed.unit.symbol);
    if (!unit) {
      unit = await prisma.unitOfMeasure.upsert({
        where: { symbol: seed.unit.symbol },
        update: { name: seed.unit.name },
        create: seed.unit,
        select: { id: true }
      });
      units.set(seed.unit.symbol, unit);
    }
    const levels = Math.max(Number(seed.maximumStock ?? 0), Number(seed.finalReportQuantity ?? 0), Number(seed.physicalBalance ?? 0), 1);
    const data = {
      description: seed.description,
      kind: seed.kind ?? ItemKind.GENERAL_SUPPLY,
      categoryId: category.id,
      unitId: unit.id,
      defaultLocationId: store.id,
      reorderLevel: Number(seed.reorderLevel ?? 0),
      minimumStock: Number(seed.minimumStock ?? 0),
      maximumStock: levels,
      fundingSourceId: funding.id,
      batchTrackingRequired: Boolean(seed.batchTrackingRequired),
      expiryTrackingRequired: Boolean(seed.expiryTrackingRequired),
      barcodeRequired: seed.barcodeRequired === undefined ? true : Boolean(seed.barcodeRequired),
      active: seed.active === undefined ? true : Boolean(seed.active)
    };
    const existing = existingByCode.get(seed.code);
    const item = existing
      ? await prisma.item.update({ where: { id: existing.id }, data })
      : await prisma.item.create({ data: { ...data, code: seed.code } });
    existingByCode.set(seed.code, { id: item.id, code: item.code });
    auditRows.push({
      action: "manual_inventory.seed_item",
      entityType: "Item",
      entityId: item.id,
      after: JSON.stringify({
        source,
        sourceRow: seed.sourceRow,
        serial: seed.serial,
        code: seed.code,
        partNumber: seed.partNumber,
        sourceOfFund: seed.sourceOfFund,
        unitPrice: seed.unitPrice,
        finalReportQuantity: seed.finalReportQuantity,
        physicalBalance: seed.physicalBalance,
        needsParameterReview: seed.needsParameterReview
      })
    });
    imported += 1;
  }

  for (let index = 0; index < auditRows.length; index += 100) {
    await prisma.auditLog.createMany({ data: auditRows.slice(index, index + 100) });
  }

  console.log(JSON.stringify({ imported, skippedRows, source }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
