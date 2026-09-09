import { BadRequestException, Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { ItemKind } from "../domain/prisma-enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { buildBinCardRows } from "./bin-card";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listItems(query: { search?: string; page?: number; pageSize?: number; active?: string; categoryId?: string; kind?: ItemKind; fundingSourceId?: string; sortBy?: string; sortDir?: string }) {
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 1000);
    const where: Prisma.ItemWhereInput = {
      active: query.active === undefined ? undefined : query.active === "true",
      categoryId: query.categoryId || undefined,
      kind: query.kind || undefined,
      fundingSourceId: query.fundingSourceId || undefined,
      NOT: { kind: { in: [ItemKind.MEDICINE, ItemKind.PERISHABLE] } },
      OR: query.search
        ? [
            { code: { contains: query.search } },
            { description: { contains: query.search } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        include: {
          category: true,
          unit: true,
          fundingSource: true,
          defaultLocation: true,
          photoFile: true,
          documentFile: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
          updatedBy: { select: { id: true, fullName: true, email: true } },
          locationBalances: true
        },
        orderBy: this.itemOrderBy(query.sortBy, query.sortDir),
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.item.count({ where })
    ]);
    return { items: items.map((item) => this.withStockStatus(item)), total, page, pageSize };
  }

  async createItem(actorId: string, input: any) {
    await this.validateItemInput(input);
    const code = input.code?.trim() ?? (await this.nextItemCode(input.kind));
    const duplicate = await this.prisma.item.findUnique({ where: { code } });
    if (duplicate) throw new BadRequestException("Item code must be unique");
    
    const sanitized = this.sanitizeFieldsByKind({
      ...input,
      kind: input.kind ?? ItemKind.CONSUMABLE,
      reorderLevel: input.reorderLevel !== undefined && input.reorderLevel !== null && input.reorderLevel !== "" ? Number(input.reorderLevel) : 0,
      minimumStock: input.minimumStock !== undefined && input.minimumStock !== null && input.minimumStock !== "" ? Number(input.minimumStock) : 0,
      maximumStock: input.maximumStock !== undefined && input.maximumStock !== null && input.maximumStock !== "" ? Number(input.maximumStock) : 0,
      batchTrackingRequired: Boolean(input.batchTrackingRequired),
      expiryTrackingRequired: Boolean(input.expiryTrackingRequired),
      barcodeRequired: input.barcodeRequired === undefined ? true : Boolean(input.barcodeRequired),
      depreciationRate: input.depreciationRate !== undefined && input.depreciationRate !== null && input.depreciationRate !== "" ? Number(input.depreciationRate) : null,
      calibrationDueDate: input.calibrationDueDate ? new Date(input.calibrationDueDate) : null,
    });

    const item = await this.prisma.item.create({
      data: {
        code,
        gtin: this.cleanOptional(sanitized.gtin),
        description: sanitized.description.trim(),
        kind: sanitized.kind,
        categoryId: sanitized.categoryId,
        unitId: sanitized.unitId,
        defaultLocationId: sanitized.defaultLocationId,
        reorderLevel: sanitized.reorderLevel,
        minimumStock: sanitized.minimumStock,
        maximumStock: sanitized.maximumStock,
        fundingSourceId: sanitized.fundingSourceId,
        batchTrackingRequired: sanitized.batchTrackingRequired,
        expiryTrackingRequired: sanitized.expiryTrackingRequired,
        barcodeRequired: sanitized.barcodeRequired,
        subCategory: sanitized.subCategory || null,
        serialNumber: sanitized.serialNumber || null,
        modelNumber: sanitized.modelNumber || null,
        depreciationRate: sanitized.depreciationRate,
        maintenanceCycle: sanitized.maintenanceCycle || null,
        departmentAssignmentId: sanitized.departmentAssignmentId || null,
        calibrationDueDate: sanitized.calibrationDueDate,
        createdById: actorId,
        updatedById: actorId
      },
      include: { category: true, unit: true, fundingSource: true, defaultLocation: true, photoFile: true, documentFile: true }
    });
    await this.audit.record({ actorId, action: "item.create", entityType: "Item", entityId: item.id, after: item });
    return item;
  }

  async updateItem(actorId: string, id: string, input: any) {
    const before = await this.prisma.item.findUniqueOrThrow({ where: { id } });
    const hasMovements = await this.hasTransactions(id);
    const unsafeFields = ["code", "kind", "batchTrackingRequired", "expiryTrackingRequired", "barcodeRequired"];
    if (hasMovements && unsafeFields.some((field) => input[field] !== undefined && input[field] !== (before as any)[field])) {
      throw new BadRequestException("Item has stock movement. Code, asset type, and tracking flags cannot be changed.");
    }
    await this.validateItemInput({ ...before, ...input }, true);
    const item = await this.prisma.item.update({
      where: { id },
      data: this.cleanUpdateInput({ ...input, kind: input.kind ?? before.kind }, actorId),
      include: { category: true, unit: true, fundingSource: true, defaultLocation: true, photoFile: true, documentFile: true }
    });
    await this.audit.record({ actorId, action: "item.update", entityType: "Item", entityId: id, before, after: item });
    return item;
  }

  async deactivateItem(actorId: string, id: string) {
    await this.prisma.item.findUniqueOrThrow({ where: { id } });
    const item = await this.prisma.item.update({ where: { id }, data: { active: false, updatedById: actorId } });
    await this.audit.record({ actorId, action: "item.deactivate", entityType: "Item", entityId: id, after: item });
    return item;
  }

  async updateItemFiles(actorId: string, id: string, input: { photoFileId?: string; documentFileId?: string }) {
    const before = await this.prisma.item.findUniqueOrThrow({ where: { id }, include: { photoFile: true, documentFile: true } });
    const item = await this.prisma.item.update({
      where: { id },
      data: {
        photoFileId: input.photoFileId ?? before.photoFileId,
        documentFileId: input.documentFileId ?? before.documentFileId,
        updatedById: actorId
      },
      include: { category: true, unit: true, fundingSource: true, defaultLocation: true, photoFile: true, documentFile: true }
    });
    await this.audit.record({ actorId, action: "item.files.update", entityType: "Item", entityId: id, before, after: item });
    return item;
  }

  async importItemsFromExcel(actorId: string, filePath: string, originalName?: string) {
    if (!filePath) throw new BadRequestException("Choose an Excel workbook before importing items.");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException("Excel workbook has no sheets.");

    const category = await this.prisma.category.upsert({
      where: { name: "Manual Inventory Import" },
      update: { active: true },
      create: { name: "Manual Inventory Import", description: "Items imported from manual Excel inventory workflows" }
    });
    const store = await this.prisma.storeLocation.upsert({
      where: { code: "MAIN" },
      update: { name: "Main Store", active: true },
      create: { code: "MAIN", name: "Main Store" }
    });
    const existingItems = await this.prisma.item.findMany({ select: { id: true, code: true } });
    const existingByCode = new Map(existingItems.map((item) => [item.code, item]));
    const usedCodes = new Set(existingItems.map((item) => item.code));
    const seenBaseCodes = new Set<string>();
    const auditRows: any[] = [];
    let imported = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let rowNumber = 17; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const serial = this.importText(row.getCell(1).value);
      const description = this.importText(row.getCell(2).value);
      if (!/^\d+$/.test(serial) || !description || /^total\b/i.test(description)) {
        skipped += 1;
        continue;
      }
      const partNumber = this.importText(row.getCell(3).value);
      const unitInfo = this.normalizeImportUnit(this.importText(row.getCell(4).value));
      const finalReportQuantity = this.importNumber(row.getCell(5).value);
      const physicalBalance = this.importNumber(row.getCell(11).value);
      const unitPrice = this.importNumber(row.getCell(13).value);
      const sourceOfFund = this.importText(row.getCell(15).value) || "Federal Allocation";
      const baseCode = this.cleanImportCode(partNumber || serial, `MIHRET-${String(serial).padStart(4, "0")}`);
      const candidateCode = seenBaseCodes.has(baseCode) ? `${baseCode}-${serial}` : baseCode;
      const code = existingByCode.has(candidateCode) ? candidateCode : this.uniqueImportCode(candidateCode, usedCodes);
      seenBaseCodes.add(baseCode);
      const unit = await this.prisma.unitOfMeasure.upsert({
        where: { symbol: unitInfo.symbol },
        update: { name: unitInfo.name },
        create: unitInfo
      });
      const funding = await this.prisma.fundingSource.upsert({
        where: { name: sourceOfFund },
        update: { active: true },
        create: { name: sourceOfFund }
      });
      const levels = Math.max(finalReportQuantity, physicalBalance, 1);
      const data = {
        description,
        kind: ItemKind.GENERAL_SUPPLY,
        categoryId: category.id,
        unitId: unit.id,
        defaultLocationId: store.id,
        reorderLevel: 0,
        minimumStock: 0,
        maximumStock: levels,
        fundingSourceId: funding.id,
        batchTrackingRequired: false,
        expiryTrackingRequired: false,
        barcodeRequired: true,
        active: true,
        updatedById: actorId
      };
      const existing = existingByCode.get(code);
      const item = existing
        ? await this.prisma.item.update({ where: { id: existing.id }, data })
        : await this.prisma.item.create({ data: { ...data, code, createdById: actorId } });
      if (existing) updated += 1;
      else created += 1;
      existingByCode.set(code, { id: item.id, code: item.code });
      auditRows.push({
        actorId,
        action: "item.import_excel",
        entityType: "Item",
        entityId: item.id,
        after: JSON.stringify({ originalName, rowNumber, serial, code, partNumber, sourceOfFund, unitPrice, finalReportQuantity, physicalBalance })
      });
      imported += 1;
    }

    for (let index = 0; index < auditRows.length; index += 100) {
      await this.prisma.auditLog.createMany({ data: auditRows.slice(index, index + 100) });
    }
    return { imported, created, updated, skipped, sheet: sheet.name };
  }

  async itemDetail(id: string) {
    const item = await this.prisma.item.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        unit: true,
        fundingSource: true,
        defaultLocation: true,
        photoFile: true,
        documentFile: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        updatedBy: { select: { id: true, fullName: true, email: true } },
        locationBalances: { include: { batch: true, store: true, storageLocation: true }, orderBy: { updatedAt: "desc" } },
        stockBatches: { orderBy: { createdAt: "desc" }, take: 20 }
        ,
        assetCustodies: { include: { custodianDepartment: true, assignedBy: { select: { fullName: true, email: true } } }, orderBy: { assignedAt: "desc" } }
      }
    });
    const recentMovements = await this.prisma.stockLedgerEntry.findMany({
      where: { itemId: id },
      include: {
        batch: true,
        storageLocation: { include: { store: true } },
        actor: { select: { fullName: true, email: true } },
        grnLine: { include: { grn: { include: { supplierDonor: true } } } },
        voucher: { include: { issueRequest: { include: { department: true } } } }
      },
      orderBy: { postedAt: "desc" },
      take: 20
    });
    const binCardMovements = await this.prisma.stockLedgerEntry.findMany({
      where: { itemId: id },
      include: {
        batch: true,
        storageLocation: { include: { store: true } },
        actor: { select: { fullName: true, email: true } },
        grnLine: { include: { grn: { include: { supplierDonor: true } } } },
        voucher: { include: { issueRequest: { include: { department: true } } } }
      },
      orderBy: { postedAt: "asc" }
    });
    const currentStock = item.locationBalances.reduce((sum, balance) => sum + Number(balance.quantityOnHand), 0);
    return {
      ...this.withStockStatus(item),
      currentStock,
      binCard: this.buildBinCard(item, binCardMovements),
      stockByLocation: item.locationBalances.map((balance) => ({
        id: balance.id,
        store: balance.store,
        storageLocation: balance.storageLocation,
        batch: balance.batch,
        quantityOnHand: Number(balance.quantityOnHand),
        quantityAvailable: Number(balance.quantityAvailable)
      })),
      stockByBatch: item.stockBatches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        status: batch.status,
        totalAcceptedQuantity: Number(batch.totalAcceptedQuantity),
        remainingQuantity: Number(batch.remainingQuantity)
      })),
      recentMovements
    };
  }

  async listAssetCustody(itemId: string) {
    await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    return this.prisma.fixedAssetCustody.findMany({
      where: { itemId },
      include: { item: { select: { id: true, code: true, description: true, kind: true } }, custodianDepartment: true, assignedBy: { select: { fullName: true, email: true } } },
      orderBy: { assignedAt: "desc" }
    });
  }

  async createAssetCustody(actorId: string, itemId: string, input: any) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    if (item.kind !== ItemKind.FIXED_ASSET) throw new BadRequestException("Custody records are only available for fixed assets");
    if (!input.assetTag?.trim()) throw new BadRequestException("Asset tag is required");
    if (!input.serialNumber?.trim()) throw new BadRequestException("Serial number is required");
    if (!input.custodianName?.trim()) throw new BadRequestException("Custodian name is required");
    const custody = await this.prisma.fixedAssetCustody.create({
      data: {
        itemId,
        assetTag: input.assetTag.trim(),
        serialNumber: input.serialNumber.trim(),
        custodianName: input.custodianName.trim(),
        custodianDepartmentId: input.custodianDepartmentId || undefined,
        location: input.location?.trim() || undefined,
        condition: input.condition || "GOOD",
        status: input.status || "ASSIGNED",
        assignedAt: input.assignedAt ? new Date(input.assignedAt) : new Date(),
        notes: input.notes?.trim() || undefined,
        assignedById: actorId
      },
      include: { custodianDepartment: true, assignedBy: { select: { fullName: true, email: true } } }
    });
    await this.audit.record({ actorId, action: "asset-custody.assign", entityType: "FixedAssetCustody", entityId: custody.id, after: custody });
    return custody;
  }

  async updateAssetCustody(actorId: string, id: string, input: any) {
    const before = await this.prisma.fixedAssetCustody.findUniqueOrThrow({ where: { id } });
    const custody = await this.prisma.fixedAssetCustody.update({
      where: { id },
      data: {
        assetTag: input.assetTag?.trim(),
        serialNumber: input.serialNumber?.trim(),
        custodianName: input.custodianName?.trim(),
        custodianDepartmentId: input.custodianDepartmentId === undefined ? undefined : input.custodianDepartmentId || null,
        location: input.location === undefined ? undefined : input.location?.trim() || null,
        condition: input.condition,
        status: input.status,
        assignedAt: input.assignedAt ? new Date(input.assignedAt) : undefined,
        notes: input.notes === undefined ? undefined : input.notes?.trim() || null
      },
      include: { custodianDepartment: true, assignedBy: { select: { fullName: true, email: true } } }
    });
    await this.audit.record({ actorId, action: "asset-custody.update", entityType: "FixedAssetCustody", entityId: id, before, after: custody });
    return custody;
  }

  async returnAssetCustody(actorId: string, id: string, input: any = {}) {
    const before = await this.prisma.fixedAssetCustody.findUniqueOrThrow({ where: { id } });
    const custody = await this.prisma.fixedAssetCustody.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnedAt: input.returnedAt ? new Date(input.returnedAt) : new Date(),
        condition: input.condition ?? before.condition,
        notes: input.notes ? `${before.notes ? `${before.notes}\n` : ""}Return notes: ${input.notes}` : before.notes
      },
      include: { custodianDepartment: true, assignedBy: { select: { fullName: true, email: true } } }
    });
    await this.audit.record({ actorId, action: "asset-custody.return", entityType: "FixedAssetCustody", entityId: id, before, after: custody });
    return custody;
  }

  masterData() {
    return Promise.all([
      this.prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      this.prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } }),
      this.prisma.fundingSource.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      this.prisma.storeLocation.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      this.prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      this.prisma.supplierDonor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      this.prisma.storageLocation.findMany({ where: { isActive: true }, include: { store: true }, orderBy: { locationCode: "asc" } }),
      this.prisma.disposalReason.findMany({ where: { active: true }, orderBy: { name: "asc" } })
    ]).then(([categories, units, fundingSources, locations, departments, supplierDonors, storageLocations, disposalReasons]) => ({
      categories,
      units,
      fundingSources,
      locations,
      departments,
      supplierDonors: this.receivingSources(supplierDonors, fundingSources),
      storageLocations,
      disposalReasons
    }));
  }

  private receivingSources(supplierDonors: any[], fundingSources: any[]) {
    const seen = new Set(supplierDonors.map((source) => source.name.trim().toLowerCase()));
    const fundingBackups = fundingSources
      .filter((source) => !seen.has(source.name.trim().toLowerCase()))
      .map((source) => ({
        id: `funding-source:${source.id}`,
        name: source.name,
        type: "GOVERNMENT_ALLOCATION",
        contact: null,
        active: source.active,
        fundingSourceId: source.id,
        derivedFromFundingSource: true
      }));
    return [...supplierDonors, ...fundingBackups].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async nextItemCode(kind: ItemKind) {
    const prefix = kind === ItemKind.FIXED_ASSET ? "EQP" : kind === ItemKind.DISPENSABLE_ASSET ? "DSP" : "ITM";
    const count = await this.prisma.item.count({ where: { code: { startsWith: prefix } } });
    return `${prefix}-${String(count + 1).padStart(4, "0")}`;
  }

  private async validateItemInput(input: any, partial = false) {
    if (!partial && !input.code?.trim()) throw new BadRequestException("Item code is required");
    this.validateGtin(input.gtin);
    if (!input.description?.trim()) throw new BadRequestException("Description is required");
    if (!input.categoryId) throw new BadRequestException("Category is required");
    if (!input.unitId) throw new BadRequestException("Unit of measure is required");
    if (!input.fundingSourceId) throw new BadRequestException("Funding source is required");
    if (!input.defaultLocationId) throw new BadRequestException("Default location is required");

    // Validate reorder/min/max stock limits dynamically depending on asset type (kind)
    const isReorderRequired = input.kind === "CONSUMABLE" || input.kind === "GENERAL_SUPPLY";
    const isReorderOptional = input.kind === "DISPENSABLE_ASSET";
    
    const hasReorder = input.reorderLevel !== undefined && input.reorderLevel !== null && input.reorderLevel !== "";
    const hasMin = input.minimumStock !== undefined && input.minimumStock !== null && input.minimumStock !== "";
    const hasMax = input.maximumStock !== undefined && input.maximumStock !== null && input.maximumStock !== "";

    if (isReorderRequired || (isReorderOptional && (hasReorder || hasMin || hasMax))) {
      const reorder = Number(input.reorderLevel ?? 0);
      const minimum = Number(input.minimumStock ?? 0);
      const maximum = Number(input.maximumStock ?? 0);
      if (Number.isNaN(reorder) || reorder < 0) throw new BadRequestException("Reorder level must be a non-negative number");
      if (Number.isNaN(minimum) || minimum < 0) throw new BadRequestException("Minimum stock must be a non-negative number");
      if (Number.isNaN(maximum) || maximum < minimum) throw new BadRequestException("Maximum stock must be greater than or equal to minimum stock");
      if (reorder < minimum || reorder > maximum) throw new BadRequestException("Reorder level should be between minimum stock and maximum stock");
    }
  }

  private sanitizeFieldsByKind(data: any) {
    const kind = data.kind;
    
    if (kind === "CONSUMABLE") {
      data.batchTrackingRequired = true;
      data.expiryTrackingRequired = true;
      
      data.serialNumber = null;
      data.modelNumber = null;
      data.depreciationRate = null;
      data.maintenanceCycle = null;
      data.departmentAssignmentId = null;
      data.calibrationDueDate = null;
    } else if (kind === "FIXED_ASSET") {
      data.batchTrackingRequired = false;
      data.expiryTrackingRequired = false;
      data.reorderLevel = 0;
      data.minimumStock = 0;
      data.maximumStock = 0;
      
      data.departmentAssignmentId = null;
      data.calibrationDueDate = null;
    } else if (kind === "DISPENSABLE_ASSET") {
      data.batchTrackingRequired = false;
      data.expiryTrackingRequired = false;
      
      data.depreciationRate = null;
      data.maintenanceCycle = null;
    } else if (kind === "GENERAL_SUPPLY") {
      data.serialNumber = null;
      data.modelNumber = null;
      data.depreciationRate = null;
      data.maintenanceCycle = null;
      data.departmentAssignmentId = null;
      data.calibrationDueDate = null;
    }
    
    return data;
  }

  private cleanUpdateInput(input: any, actorId: string) {
    const allowed = [
      "code",
      "gtin",
      "description",
      "kind",
      "categoryId",
      "unitId",
      "defaultLocationId",
      "reorderLevel",
      "minimumStock",
      "maximumStock",
      "fundingSourceId",
      "batchTrackingRequired",
      "expiryTrackingRequired",
      "barcodeRequired",
      "active",
      "subCategory",
      "serialNumber",
      "modelNumber",
      "depreciationRate",
      "maintenanceCycle",
      "departmentAssignmentId",
      "calibrationDueDate"
    ];
    const data: any = { updatedById: actorId };
    for (const key of allowed) {
      if (input[key] !== undefined) data[key] = input[key];
    }
    if (data.reorderLevel !== undefined) data.reorderLevel = data.reorderLevel !== null && data.reorderLevel !== "" ? Number(data.reorderLevel) : 0;
    if (data.minimumStock !== undefined) data.minimumStock = data.minimumStock !== null && data.minimumStock !== "" ? Number(data.minimumStock) : 0;
    if (data.maximumStock !== undefined) data.maximumStock = data.maximumStock !== null && data.maximumStock !== "" ? Number(data.maximumStock) : 0;
    if (data.depreciationRate !== undefined) data.depreciationRate = data.depreciationRate !== null && data.depreciationRate !== "" ? Number(data.depreciationRate) : null;
    if (data.calibrationDueDate !== undefined) data.calibrationDueDate = data.calibrationDueDate ? new Date(data.calibrationDueDate) : null;
    if (data.description) data.description = data.description.trim();
    if (data.code) data.code = data.code.trim();
    if (data.gtin !== undefined) data.gtin = this.cleanOptional(data.gtin);
    
    return this.sanitizeFieldsByKind(data);
  }

  private cleanOptional(value: any) {
    const text = String(value ?? "").trim();
    return text || undefined;
  }

  private validateGtin(value: any) {
    const text = String(value ?? "").trim();
    if (text && !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(text)) throw new BadRequestException("GTIN must be 8, 12, 13, or 14 digits when provided");
  }

  private itemOrderBy(sortBy?: string, sortDir?: string): Prisma.ItemOrderByWithRelationInput {
    const direction = sortDir === "desc" ? "desc" : "asc";
    if (sortBy === "description") return { description: direction };
    if (sortBy === "category") return { category: { name: direction } };
    return { code: direction };
  }

  private withStockStatus(item: any) {
    const currentStock = item.locationBalances?.reduce((sum: number, balance: any) => sum + Number(balance.quantityOnHand), 0) ?? 0;
    if (!item.locationBalances?.length && currentStock === 0) return { ...item, currentStock, stockStatus: "NOT_RECEIVED" };
    let stockStatus = "NORMAL";
    if (currentStock === 0) stockStatus = "STOCK_OUT";
    else if (currentStock < Number(item.minimumStock)) stockStatus = "BELOW_MINIMUM";
    else if (currentStock <= Number(item.reorderLevel)) stockStatus = "LOW_STOCK";
    else if (currentStock > Number(item.maximumStock)) stockStatus = "OVERSTOCK";
    return { ...item, currentStock, stockStatus };
  }

  private importText(value: unknown) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  private importNumber(value: unknown) {
    const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private cleanImportCode(raw: string, fallback: string) {
    if (!raw || /^none$/i.test(raw) || /^n\/a$/i.test(raw)) return fallback;
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9._/-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return cleaned || fallback;
  }

  private normalizeImportUnit(raw: string) {
    const value = raw.trim();
    if (/^each$/i.test(value)) return { symbol: "ea", name: "Each" };
    if (/^pcs?$/i.test(value)) return { symbol: "pc", name: "Piece" };
    if (/^packs?$/i.test(value)) return { symbol: "pack", name: "Pack" };
    return { symbol: value || "ea", name: value || "Each" };
  }

  private uniqueImportCode(base: string, usedCodes: Set<string>) {
    let code = base.slice(0, 48);
    let suffix = 2;
    while (usedCodes.has(code)) {
      code = `${base.slice(0, 43)}-${suffix}`;
      suffix += 1;
    }
    usedCodes.add(code);
    return code;
  }

  private buildBinCard(item: any, movements: any[]) {
    return buildBinCardRows(item, movements);
  }

  private async hasTransactions(id: string) {
    const [ledger, grn, issues] = await this.prisma.$transaction([
      this.prisma.stockLedgerEntry.count({ where: { itemId: id } }),
      this.prisma.goodsReceivingLine.count({ where: { itemId: id } }),
      this.prisma.issueRequestLine.count({ where: { itemId: id } })
    ]);
    return ledger + grn + issues > 0;
  }
}
