import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type SeedItem = {
  sourceRow: number;
  serial: string;
  code: string;
  description: string;
  partNumber: string | null;
  unit: { symbol: string; name: string };
  finalReportQuantity: number;
  physicalBalance: number;
  unitPrice: number;
  sourceOfFund: string | null;
  categoryName: string;
  categoryDescription: string;
  kind: "GENERAL_SUPPLY";
  defaultStoreCode: string;
  defaultStoreName: string;
  fundingSourceName: string;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  batchTrackingRequired: boolean;
  expiryTrackingRequired: boolean;
  barcodeRequired: boolean;
  active: boolean;
  needsParameterReview: boolean;
};

const workbookPath = process.argv[2] ?? "D:\\not\\INVENTORY 2018_ MIHRET.xlsx";
const outputPath = process.argv[3] ?? "apps/api/prisma/data/mihret-items.seed.json";

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

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook has no sheets");

  const usedCodes = new Set<string>();
  const seenBaseCodes = new Set<string>();
  const items: SeedItem[] = [];
  let skipped = 0;

  for (let rowNumber = 17; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const serial = text(row.getCell(1).value);
    const description = text(row.getCell(2).value);
    if (!/^\d+$/.test(serial) || !description || /^total\b/i.test(description)) {
      skipped += 1;
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
      kind: "GENERAL_SUPPLY",
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

  const payload = {
    sourceWorkbook: resolve(workbookPath),
    generatedAt: new Date().toISOString(),
    rowStart: 17,
    skippedRows: skipped,
    defaults: {
      categoryName: "Manual Inventory Import",
      kind: "GENERAL_SUPPLY",
      defaultStoreCode: "MAIN",
      fundingFallback: "Federal Allocation",
      reorderLevel: 0,
      minimumStock: 0,
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true
    },
    items
  };

  await writeFile(resolve(outputPath), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath: resolve(outputPath), items: items.length, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
