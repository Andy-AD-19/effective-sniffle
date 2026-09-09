import { Injectable, StreamableFile } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import PDFDocument = require("pdfkit");
import { ReportType } from "@fmoh/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "./ledger.service";

type ReportColumn = { key: string; label: string; width?: number; align?: "left" | "right" | "center" };
type FlatReportRow = Record<string, any>;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService) {}

  async data(type: ReportType, filters: any) {
    const balances = await this.ledger.balances({ itemId: filters.itemId, locationId: filters.locationId });
    let rows: any[];
    if (type === "receipt" || type === "grn") {
      rows = await this.prisma.goodsReceivingNote.findMany({
        include: { lines: { include: { item: { include: { category: true, unit: true, fundingSource: true } }, inspection: true, fundingSource: true } }, supplierDonor: true },
        orderBy: { createdAt: "desc" }
      });
    } else if (type === "issue") {
      rows = await this.prisma.issueRequest.findMany({
        include: { lines: { include: { item: { include: { category: true, unit: true, fundingSource: true } } } }, department: true, approval: true, voucher: true },
        orderBy: { createdAt: "desc" }
      });
    } else if (type === "store-issue-voucher") {
      rows = await this.prisma.storeIssueVoucher.findMany({
        include: { issueRequest: { include: { department: true, lines: { include: { item: { include: { category: true, unit: true, fundingSource: true } } } } } }, ledgerEntries: true },
        orderBy: { issuedAt: "desc" }
      });
    } else if (type === "disposal") {
      rows = await this.prisma.disposalRequest.findMany({ include: { lines: { include: { item: { include: { category: true, unit: true } } } } }, orderBy: { createdAt: "desc" } });
    } else if (type === "physical-count") {
      rows = await this.prisma.physicalCount.findMany({ include: { lines: { include: { item: { include: { category: true, unit: true } } } }, adjustments: true }, orderBy: { openedAt: "desc" } });
    } else if (type === "reconciliation-adjustment") {
      rows = await this.prisma.stockAdjustment.findMany({ include: { item: { include: { category: true, unit: true } }, physicalCount: true, requestedBy: true, approver: true }, orderBy: { createdAt: "desc" } });
    } else if (type === "asset-custody") {
      rows = await this.prisma.fixedAssetCustody.findMany({
        include: { item: { include: { category: true, unit: true, fundingSource: true } }, custodianDepartment: true, assignedBy: true },
        orderBy: { assignedAt: "desc" }
      });
    } else if (type === "audit-log") {
      rows = await this.prisma.auditLog.findMany({ include: { actor: { select: { email: true, fullName: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    } else if (type === "stock-out") {
      rows = this.stockStatusRows(balances, "stock-out");
    } else if (type === "reorder") {
      rows = this.stockStatusRows(balances, "reorder");
    } else if (type === "valuation") {
      rows = balances.map((row) => ({ ...row, value: Number(row.quantity ?? 0) * Number(row.unitCost ?? 0) }));
    } else if (type === "consumption") {
      rows = await this.prisma.stockLedgerEntry.findMany({ where: { type: "ISSUE" }, include: { item: { include: { category: true, unit: true, fundingSource: true } }, actor: true, voucher: { include: { issueRequest: { include: { department: true } } } } }, orderBy: { postedAt: "desc" } });
    } else if (type === "fast-moving" || type === "slow-moving") {
      rows = await this.movementRanking(type);
    } else {
      rows = balances;
    }
    return this.applyFilters(rows, filters);
  }

  async excel(type: ReportType, filters: any) {
    const rows = await this.data(type, filters);
    const flatRows = this.flattenRows(type, rows);
    const columns = this.columnsFor(type, flatRows);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FMOH Inventory Management System";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(this.reportTitle(type).slice(0, 31), { views: [{ state: "frozen", ySplit: 6 }] });
    sheet.properties.defaultRowHeight = 19;
    sheet.mergeCells(1, 1, 1, columns.length);
    sheet.getCell(1, 1).value = `FMOH Inventory Management System - ${this.reportTitle(type)}`;
    sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    sheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    sheet.getCell(1, 1).alignment = { vertical: "middle" };
    sheet.getRow(1).height = 28;
    sheet.addRow(["Generated", this.formatDateTime(new Date())]);
    sheet.addRow(["Criteria", this.filterSummary(filters)]);
    sheet.addRow(["Total rows", flatRows.length]);
    sheet.addRow([]);
    const header = sheet.addRow(columns.map((column) => column.label));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF134E4A" } };
    header.alignment = { vertical: "middle", wrapText: true };
    header.height = 24;
    flatRows.forEach((row) => sheet.addRow(columns.map((column) => row[column.key] ?? "N/A")));
    sheet.columns = columns.map((column) => ({ key: column.key, width: column.width ?? 18 }));
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } };
        cell.alignment = { vertical: "top", wrapText: true };
      });
      if (rowNumber > 6 && rowNumber % 2 === 1) row.eachCell((cell) => cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } });
    });
    sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: columns.length } };
    const buffer = await workbook.xlsx.writeBuffer();
    await this.recordExport(type, "XLSX", filters);
    return new StreamableFile(Buffer.from(buffer));
  }

  async pdf(type: ReportType, filters: any) {
    const rows = await this.data(type, filters);
    const flatRows = this.flattenRows(type, rows);
    const columns = this.columnsFor(type, flatRows);
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const finished = new Promise<void>((resolve) => doc.on("end", () => resolve()));

    this.drawReportHeader(doc, type, filters, flatRows.length);
    if (!flatRows.length) {
      doc.moveDown(2);
      doc.font("Helvetica").fontSize(11).fillColor("#334155").text("No data is available for the selected report criteria.", { align: "center" });
    } else {
      this.drawTable(doc, type, filters, columns, flatRows.slice(0, 500), flatRows.length);
      if (flatRows.length > 500) {
        doc.moveDown();
        doc.fontSize(8).fillColor("#64748b").text(`Showing first 500 rows of ${flatRows.length}. Export Excel for the complete detailed register.`);
      }
    }
    this.drawPageFooters(doc);
    doc.end();
    await finished;
    await this.recordExport(type, "PDF", filters);
    return new StreamableFile(Buffer.concat(chunks));
  }

  private recordExport(reportType: string, format: "PDF" | "XLSX", filters: any) {
    return this.prisma.reportExport.create({ data: { reportType, format, filters: JSON.stringify(filters ?? {}), generatedById: filters.actorId ?? "system" } }).catch(() => null);
  }

  private stockStatusRows(balances: any[], mode: "stock-out" | "reorder") {
    const totals = new Map<string, any>();
    for (const row of balances) {
      const current = totals.get(row.itemId) ?? { ...row, quantity: 0, value: 0 };
      current.quantity += Number(row.quantity ?? 0);
      current.value += Number(row.quantity ?? 0) * Number(row.unitCost ?? 0);
      totals.set(row.itemId, current);
    }
    return [...totals.values()].filter((row) => mode === "stock-out" ? row.quantity <= 0 : row.quantity <= Number(row.item?.reorderLevel ?? 0));
  }

  private async movementRanking(type: "fast-moving" | "slow-moving") {
    const rows = await this.prisma.stockLedgerEntry.groupBy({ by: ["itemId"], where: { type: "ISSUE" }, _sum: { quantity: true }, _count: { itemId: true } });
    const items = await this.prisma.item.findMany({ where: { id: { in: rows.map((row) => row.itemId) } }, include: { category: true, unit: true, fundingSource: true } });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const ranked = rows.map((row) => ({ item: itemMap.get(row.itemId), issuedQuantity: Math.abs(Number(row._sum.quantity ?? 0)), issueCount: row._count.itemId }));
    return ranked.sort((a, b) => type === "fast-moving" ? b.issuedQuantity - a.issuedQuantity : a.issuedQuantity - b.issuedQuantity);
  }

  private applyFilters(rows: any[], filters: any) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;
    if (dateTo) dateTo.setHours(23, 59, 59, 999);
    return rows.filter((row) => {
      if (filters.status && String(row.status ?? row.stockStatus ?? "").toLowerCase() !== String(filters.status).toLowerCase()) return false;
      if (filters.itemId && !this.rowHasItem(row, filters.itemId)) return false;
      const rawDate = row.postedAt ?? row.createdAt ?? row.receivedAt ?? row.issuedAt ?? row.openedAt ?? row.assignedAt;
      if (!rawDate || (!dateFrom && !dateTo)) return true;
      const date = new Date(rawDate);
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }

  private rowHasItem(row: any, itemId: string) {
    return row.itemId === itemId || row.item?.id === itemId || row.lines?.some?.((line: any) => line.itemId === itemId || line.item?.id === itemId) || row.issueRequest?.lines?.some?.((line: any) => line.itemId === itemId || line.item?.id === itemId);
  }

  private flattenRows(type: ReportType, rows: any[]) {
    if (["receipt", "grn", "issue", "store-issue-voucher", "physical-count", "disposal"].includes(type)) {
      return rows.flatMap((row) => {
        const lines = row.lines ?? row.issueRequest?.lines ?? [];
        if (!lines.length) return [this.flattenRow(type, row)];
        return lines.map((line: any) => this.flattenRow(type, row, line));
      });
    }
    return rows.map((row) => this.flattenRow(type, row));
  }

  private flattenRow(type: ReportType, row: any, line?: any): FlatReportRow {
    const item = line?.item ?? row.item ?? row.lines?.[0]?.item ?? row.issueRequest?.lines?.[0]?.item;
    const quantity = line?.quantity ?? line?.quantityReceived ?? line?.systemQuantity ?? line?.countedQuantity ?? row.quantity ?? row.quantityAvailable ?? row.quantityOnHand ?? row.issuedQuantity ?? row.currentStock;
    const unitCost = line?.unitPrice ?? row.unitCost;
    return {
      date: this.formatDate(row.postedAt ?? row.createdAt ?? row.receivedAt ?? row.issuedAt ?? row.openedAt ?? row.assignedAt),
      reference: row.grnNumber ?? row.requestNumber ?? row.voucherNumber ?? row.voucher?.voucherNumber ?? row.disposalNumber ?? row.countNumber ?? row.adjustmentNumber ?? row.entryNumber ?? row.id,
      itemCode: item?.code ?? row.code ?? "N/A",
      item: item?.description ?? row.description ?? "N/A",
      category: item?.category?.name ?? "N/A",
      unit: item?.unit?.symbol ?? "N/A",
      fundingSource: item?.fundingSource?.name ?? line?.fundingSource?.name ?? row.fundingSource?.name ?? "N/A",
      provider: row.supplierDonor?.name ?? row.provider ?? "N/A",
      department: row.department?.name ?? row.custodianDepartment?.name ?? row.issueRequest?.department?.name ?? row.voucher?.issueRequest?.department?.name ?? "N/A",
      status: this.reportStatus(type, row, item, quantity),
      transactionType: this.formatStatus(row.type ?? row.sourceType ?? type),
      batchNumber: line?.batchNumber ?? row.batchNumber ?? row.batch?.batchNumber ?? "N/A",
      expiryDate: this.formatDate(line?.expiryDate ?? row.expiryDate ?? row.batch?.expiryDate),
      store: row.store?.name ?? row.storageLocation?.store?.name ?? "N/A",
      shelf: row.shelfCode ?? row.storageLocation?.shelfNumber ?? "N/A",
      bin: row.binCode ?? row.storageLocation?.binNumber ?? "N/A",
      quantity: this.formatNumber(quantity),
      unitCost: this.formatCurrency(unitCost),
      value: this.formatCurrency(row.value ?? (Number(quantity ?? 0) * Number(unitCost ?? 0))),
      variance: line ? this.formatNumber(Number(line.countedQuantity ?? line.systemQuantity ?? 0) - Number(line.systemQuantity ?? 0)) : this.formatNumber(row.quantityDelta),
      actor: row.actor?.fullName ?? row.actor?.email ?? "N/A",
      reason: row.reason ?? row.method ?? row.action ?? row.notes ?? "N/A",
      assetTag: row.assetTag ?? "N/A",
      serialNumber: row.serialNumber ?? "N/A",
      custodian: row.custodianName ?? "N/A",
      assignedAt: this.formatDate(row.assignedAt),
      returnedAt: this.formatDate(row.returnedAt),
      condition: row.condition ? this.formatStatus(row.condition) : "N/A"
    };
  }

  private columnsFor(type: ReportType, rows: FlatReportRow[]): ReportColumn[] {
    const common: ReportColumn[] = [
      { key: "date", label: "Date", width: 14 },
      { key: "reference", label: "Reference", width: 20 },
      { key: "itemCode", label: "Item code", width: 14 },
      { key: "item", label: "Item description", width: 32 },
      { key: "status", label: "Status", width: 16 },
      { key: "quantity", label: "Quantity", width: 12, align: "right" }
    ];
    const definitions: Partial<Record<ReportType, ReportColumn[]>> = {
      "stock-status": [{ key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 34 }, { key: "category", label: "Category", width: 18 }, { key: "unit", label: "Unit", width: 10 }, { key: "quantity", label: "Available", width: 12, align: "right" }, { key: "status", label: "Stock status", width: 18 }, { key: "store", label: "Store", width: 18 }, { key: "shelf", label: "Shelf", width: 10 }, { key: "bin", label: "Bin", width: 10 }],
      valuation: [{ key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 34 }, { key: "category", label: "Category", width: 18 }, { key: "quantity", label: "Quantity", width: 12, align: "right" }, { key: "unitCost", label: "Unit cost", width: 14, align: "right" }, { key: "value", label: "Value", width: 14, align: "right" }, { key: "store", label: "Store", width: 18 }],
      receipt: [{ key: "date", label: "Date", width: 14 }, { key: "reference", label: "GRN", width: 18 }, { key: "provider", label: "Supplier / donor", width: 24 }, { key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 30 }, { key: "batchNumber", label: "Batch", width: 14 }, { key: "expiryDate", label: "Expiry", width: 12 }, { key: "quantity", label: "Received", width: 12, align: "right" }, { key: "status", label: "Status", width: 14 }],
      grn: [{ key: "date", label: "Date", width: 14 }, { key: "reference", label: "GRN", width: 18 }, { key: "provider", label: "Supplier / donor", width: 24 }, { key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 30 }, { key: "batchNumber", label: "Batch", width: 14 }, { key: "expiryDate", label: "Expiry", width: 12 }, { key: "quantity", label: "Received", width: 12, align: "right" }, { key: "status", label: "Status", width: 14 }],
      issue: [{ key: "date", label: "Date", width: 14 }, { key: "reference", label: "Request / SIV", width: 18 }, { key: "department", label: "Department", width: 22 }, { key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 32 }, { key: "quantity", label: "Issued / requested", width: 14, align: "right" }, { key: "status", label: "Status", width: 14 }],
      "physical-count": [{ key: "date", label: "Opened", width: 14 }, { key: "reference", label: "Count number", width: 18 }, { key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 34 }, { key: "quantity", label: "System qty", width: 12, align: "right" }, { key: "variance", label: "Variance", width: 12, align: "right" }, { key: "status", label: "Status", width: 14 }],
      "asset-custody": [{ key: "assetTag", label: "Asset tag", width: 16 }, { key: "serialNumber", label: "Serial number", width: 18 }, { key: "itemCode", label: "Item code", width: 14 }, { key: "item", label: "Item description", width: 30 }, { key: "custodian", label: "Custodian", width: 24 }, { key: "department", label: "Department", width: 22 }, { key: "assignedAt", label: "Assigned", width: 14 }, { key: "returnedAt", label: "Returned", width: 14 }, { key: "condition", label: "Condition", width: 14 }, { key: "status", label: "Status", width: 14 }],
      "audit-log": [{ key: "date", label: "Date", width: 16 }, { key: "actor", label: "Actor", width: 24 }, { key: "transactionType", label: "Action", width: 24 }, { key: "reference", label: "Entity / record", width: 30 }, { key: "reason", label: "Details", width: 36 }]
    };
    return definitions[type] ?? (rows.some((row) => row.value && row.value !== "N/A") ? [...common, { key: "value", label: "Value", width: 14, align: "right" }] : common);
  }

  private drawReportHeader(doc: PDFKit.PDFDocument, type: ReportType, filters: any, rowCount: number) {
    const left = doc.page.margins.left;
    const top = doc.page.margins.top;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.rect(left, top, width, 62).fill("#0f766e");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(17).text("FMOH Inventory Management System", left + 14, top + 12);
    doc.font("Helvetica").fontSize(9).text("Federal Ministry of Health - Inventory and Logistics Report", left + 14, top + 36);
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text(this.reportTitle(type), left, top + 78);
    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(`Generated: ${this.formatDateTime(new Date())}`, left, top + 98);
    doc.text(`Criteria: ${this.filterSummary(filters)}`, left + 220, top + 98, { width: width - 360 });
    doc.text(`Rows: ${rowCount}`, left + width - 100, top + 98, { width: 100, align: "right" });
    doc.moveTo(left, top + 116).lineTo(left + width, top + 116).strokeColor("#cbd5e1").stroke();
    doc.y = top + 128;
  }

  private drawTable(doc: PDFKit.PDFDocument, type: ReportType, filters: any, columns: ReportColumn[], rows: FlatReportRow[], totalRows: number) {
    const left = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const totalWeight = columns.reduce((sum, column) => sum + (column.width ?? 16), 0);
    const widths = columns.map((column) => Math.floor(((column.width ?? 16) / totalWeight) * usableWidth));
    const rowHeight = 24;
    const headerHeight = 26;
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 18;
    const drawHeader = () => {
      const headerY = doc.y;
      let x = left;
      doc.rect(left, headerY, usableWidth, headerHeight).fill("#134e4a");
      columns.forEach((column, index) => {
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5).text(column.label, x + 4, headerY + 8, { width: widths[index] - 8, align: column.align ?? "left", lineBreak: false });
        x += widths[index];
      });
      doc.y = headerY + headerHeight;
    };
    drawHeader();
    rows.forEach((row, rowIndex) => {
      if (doc.y + rowHeight > bottomLimit) {
        doc.addPage();
        this.drawReportHeader(doc, type, filters, totalRows);
        drawHeader();
      }
      let x = left;
      const y = doc.y;
      doc.rect(left, y, usableWidth, rowHeight).fill(rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc");
      doc.strokeColor("#e2e8f0").moveTo(left, y + rowHeight).lineTo(left + usableWidth, y + rowHeight).stroke();
      columns.forEach((column, index) => {
        doc.fillColor("#0f172a").font("Helvetica").fontSize(7.3).text(this.cleanCell(row[column.key]), x + 4, y + 7, { width: widths[index] - 8, align: column.align ?? "left", lineBreak: false, ellipsis: true });
        x += widths[index];
      });
      doc.y = y + rowHeight;
    });
  }

  private drawPageFooters(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(`Generated by FMOH Inventory Management System | Page ${index + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 24, { align: "center" });
    }
  }

  private reportTitle(type: ReportType) {
    return `${type.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} Report`;
  }

  private filterSummary(filters: any) {
    const entries = Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
    return entries.length ? entries.map(([key, value]) => `${key}: ${value}`).join("; ") : "All available records";
  }

  private cleanCell(value: any) {
    if (value === undefined || value === null || value === "") return "N/A";
    return String(value).replace(/\s+/g, " ").slice(0, 120);
  }

  private formatDate(value: any) {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("en-GB");
  }

  private formatDateTime(value: any) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString("en-GB");
  }

  private formatNumber(value: any) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-GB") : "N/A";
  }

  private formatCurrency(value: any) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A";
  }

  private formatStatus(value: any) {
    return String(value ?? "N/A").replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private reportStatus(type: ReportType, row: any, item: any, quantity: any) {
    const explicit = row.status ?? row.stockStatus;
    if (explicit) return this.formatStatus(explicit);
    if (["stock-status", "balance", "valuation", "stock-out", "reorder"].includes(type)) {
      const qty = Number(quantity ?? row.quantityAvailable ?? row.currentStock ?? 0);
      const minimum = Number(item?.minimumStock ?? row.minimumStock ?? 0);
      const reorder = Number(item?.reorderLevel ?? row.reorderLevel ?? minimum);
      const maximum = Number(item?.maximumStock ?? row.maximumStock ?? Number.POSITIVE_INFINITY);
      if (qty <= 0) return "Stock Out";
      if (qty < minimum) return "Below Minimum";
      if (qty <= reorder) return "Low Stock";
      if (Number.isFinite(maximum) && qty > maximum) return "Overstock";
      return "Normal";
    }
    return this.formatStatus(row.type ?? row.sourceType ?? "Recorded");
  }
}
