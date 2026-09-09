import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { tmpdir } from "node:os";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CountCycleType, ItemKind, QualityStatus, RoleName, StockSourceType } from "./domain/prisma-enums";
import { permissions } from "@fmoh/shared";
import { CurrentUser } from "./auth/current-user.decorator";
import { RequireAnyPermission, RequirePermissions } from "./auth/permissions.decorator";
import { DisposalService } from "./services/disposal.service";
import { InventoryService } from "./services/inventory.service";
import { IssueService } from "./services/issue.service";
import { LedgerService } from "./services/ledger.service";
import { PhysicalCountService } from "./services/physical-count.service";
import { ReceivingService } from "./services/receiving.service";
import { UsersService } from "./services/users.service";
import { MasterDataService } from "./services/master-data.service";
import { AuditQueryService } from "./services/audit-query.service";
import { NotificationsService } from "./services/notifications.service";
import { StorageService } from "./services/storage.service";
import { FileUploadService } from "./services/file-upload.service";
import { ReturnService } from "./services/return.service";

class ItemDto {
  @IsString() code!: string;
  @IsOptional() @IsString() gtin?: string;
  @IsString() description!: string;
  @IsEnum(ItemKind) kind!: ItemKind;
  @IsString() categoryId!: string;
  @IsString() unitId!: string;
  @IsString() defaultLocationId!: string;
  @IsOptional() @IsNumber() reorderLevel?: number;
  @IsOptional() @IsNumber() minimumStock?: number;
  @IsOptional() @IsNumber() maximumStock?: number;
  @IsString() fundingSourceId!: string;
  @IsOptional() @IsBoolean() batchTrackingRequired?: boolean;
  @IsOptional() @IsBoolean() expiryTrackingRequired?: boolean;
  @IsOptional() @IsBoolean() barcodeRequired?: boolean;
  @IsOptional() @IsString() subCategory?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() modelNumber?: string;
  @IsOptional() @IsNumber() depreciationRate?: number;
  @IsOptional() @IsString() maintenanceCycle?: string;
  @IsOptional() @IsString() departmentAssignmentId?: string;
  @IsOptional() @IsString() calibrationDueDate?: string;
}

class GrnLineDto {
  @IsString() itemId!: string;
  @IsNumber() quantityReceived!: number;
  @IsNumber() unitPrice!: number;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() fundingSourceId?: string;
  @IsOptional() @IsString() remarks?: string;
}

class GrnDto {
  @IsEnum(StockSourceType) sourceType!: StockSourceType;
  @IsOptional() @IsString() purchaseOrderRef?: string;
  @IsOptional() @IsString() donationLetterRef?: string;
  @IsOptional() @IsString() governmentAllocationRef?: string;
  @IsOptional() @IsString() projectSupportRef?: string;
  @IsOptional() @IsString() deliveryNoteRef?: string;
  @IsString() supplierDonorId!: string;
  @IsOptional() @IsString() remarks?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => GrnLineDto) lines!: GrnLineDto[];
}

class InspectDto {
  @IsNumber() quantityVerified!: number;
  @IsNumber() quantityAccepted!: number;
  @IsNumber() quantityRejected!: number;
  @IsOptional() @IsEnum(QualityStatus) qualityStatus?: QualityStatus;
  @IsOptional() @IsString() qualityNotes?: string;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() storeLocationId?: string;
  @IsOptional() @IsString() shelfCode?: string;
  @IsOptional() @IsString() binCode?: string;
}

class RequestLineDto {
  @IsString() itemId!: string;
  @IsNumber() quantity!: number;
}

class IssueDto {
  @IsString() departmentId!: string;
  @IsString() recipientName!: string;
  @IsString() purpose!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RequestLineDto) lines!: RequestLineDto[];
}

class UserDto {
  @IsString() email!: string;
  @IsString() fullName!: string;
  @IsEnum(RoleName) role!: RoleName;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() password?: string;
}

class MasterDto {
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() symbol?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() contact?: string;
}

class StorageLocationDto {
  @IsString() storeId!: string;
  @IsString() locationCode!: string;
  @IsOptional() @IsString() gln?: string;
  @IsOptional() @IsString() roomOrZone?: string;
  @IsString() shelfNumber!: string;
  @IsOptional() @IsString() rackNumber?: string;
  @IsString() binNumber!: string;
  @IsOptional() @IsString() description?: string;
}

class StorageAllocationDto {
  @IsString() storageLocationId!: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() barcodeFileId?: string;
  @IsOptional() @IsString() qrCodeFileId?: string;
}

class AssetCustodyDto {
  @IsString() assetTag!: string;
  @IsString() serialNumber!: string;
  @IsString() custodianName!: string;
  @IsOptional() @IsString() custodianDepartmentId?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() assignedAt?: string;
  @IsOptional() @IsString() notes?: string;
}

class ReturnLineDto {
  @IsString() itemId!: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() batchId?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() storageLocationId?: string;
  @IsOptional() @IsString() conditionNotes?: string;
}

class CreateReturnDto {
  @IsOptional() @IsString() voucherId?: string;
  @IsOptional() @IsString() issueRequestId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsString() reason!: string;
  @IsOptional() @IsString() conditionNotes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReturnLineDto) lines!: ReturnLineDto[];
}

class InspectReturnLineDto {
  @IsString() lineId!: string;
  @IsNumber() quantityAccepted!: number;
  @IsNumber() quantityRejected!: number;
  @IsOptional() @IsString() conditionNotes?: string;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() targetStoreId?: string;
  @IsOptional() @IsString() targetStorageLocationId?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() qualityStatus?: "PASS" | "FAIL";
}

class InspectReturnDto {
  @IsString() outcome!: "APPROVED" | "REJECTED" | "PARTIALLY_APPROVED";
  @IsOptional() @IsString() qualityStatus?: "PASS" | "FAIL";
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() targetStoreId?: string;
  @IsOptional() @IsString() targetStorageLocationId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InspectReturnLineDto) lines?: InspectReturnLineDto[];
}

@Controller()
export class DomainController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly receiving: ReceivingService,
    private readonly ledger: LedgerService,
    private readonly issues: IssueService,
    private readonly returns: ReturnService,
    private readonly counts: PhysicalCountService,
    private readonly disposals: DisposalService,
    private readonly users: UsersService,
    private readonly master: MasterDataService,
    private readonly auditQuery: AuditQueryService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly files: FileUploadService
  ) {}

  @Post("uploads")
  @UseInterceptors(FileInterceptor("file", { storage: diskStorage({ destination: tmpdir() }) }))
  uploadFile(@CurrentUser() user: any, @UploadedFile() file: any, @Body() body: { category?: string }) {
    return this.files.save(user.sub, file, body.category ?? "supporting-document").catch((error) => {
      this.files.cleanupTemp(file);
      throw error;
    });
  }

  @Get("uploads/:id")
  async getUpload(@Param("id") id: string) {
    return (await this.files.stream(id)).stream;
  }

  @Get("master-data")
  @RequirePermissions(permissions.ITEM_READ)
  masterData() {
    return this.inventory.masterData();
  }

  @Get("admin/users")
  @RequirePermissions(permissions.USER_MANAGE)
  usersList(@Query() query: any) {
    return this.users.list(query);
  }

  @Post("admin/users")
  @RequirePermissions(permissions.USER_MANAGE)
  createUser(@CurrentUser() user: any, @Body() dto: UserDto) {
    return this.users.create(user.sub, dto);
  }

  @Patch("admin/users/:id")
  @RequirePermissions(permissions.USER_MANAGE)
  updateUser(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: Partial<UserDto & { active: boolean }>) {
    return this.users.update(user.sub, id, dto);
  }

  @Patch("admin/users/:id/active")
  @RequirePermissions(permissions.USER_MANAGE)
  setUserActive(@CurrentUser() user: any, @Param("id") id: string, @Body() body: { active: boolean }) {
    return this.users.setActive(user.sub, id, body.active);
  }

  @Get("admin/master-data/:model")
  @RequirePermissions(permissions.USER_MANAGE)
  masterList(@Param("model") model: any) {
    return this.master.list(model);
  }

  @Post("admin/master-data/:model")
  @RequirePermissions(permissions.USER_MANAGE)
  masterCreate(@CurrentUser() user: any, @Param("model") model: any, @Body() dto: MasterDto) {
    return this.master.create(user.sub, model, dto);
  }

  @Patch("admin/master-data/:model/:id")
  @RequirePermissions(permissions.USER_MANAGE)
  masterUpdate(@CurrentUser() user: any, @Param("model") model: any, @Param("id") id: string, @Body() dto: Partial<MasterDto & { active: boolean }>) {
    return this.master.update(user.sub, model, id, dto);
  }

  @Delete("admin/master-data/:model")
  @RequirePermissions(permissions.USER_MANAGE)
  masterDeleteMany(@CurrentUser() user: any, @Param("model") model: any, @Body() dto: { ids: string[] }) {
    return this.master.deleteMany(user.sub, model, dto.ids ?? []);
  }

  @Get("audit-logs")
  @RequirePermissions(permissions.AUDIT_READ)
  auditLogs(@Query() query: any) {
    return this.auditQuery.list(query);
  }

  @Get("notifications")
  @RequirePermissions(permissions.DASHBOARD_READ)
  alerts() {
    return this.notifications.list();
  }

  @Get("storage-locations")
  @RequirePermissions(permissions.STORAGE_WRITE)
  storageLocations() {
    return this.storage.listLocations();
  }

  @Post("storage-locations")
  @RequirePermissions(permissions.STORAGE_WRITE)
  createStorageLocation(@CurrentUser() user: any, @Body() dto: StorageLocationDto) {
    return this.storage.createLocation(user.sub, dto);
  }

  @Patch("storage-locations/:id")
  @RequirePermissions(permissions.STORAGE_WRITE)
  updateStorageLocation(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: Partial<StorageLocationDto & { isActive: boolean }>) {
    return this.storage.updateLocation(user.sub, id, dto);
  }

  @Patch("storage-locations/:id/active")
  @RequirePermissions(permissions.STORAGE_WRITE)
  setStorageLocationActive(@CurrentUser() user: any, @Param("id") id: string, @Body() body: { active: boolean }) {
    return this.storage.setLocationActive(user.sub, id, body.active);
  }

  @Get("stock-batches")
  @RequirePermissions(permissions.STORAGE_WRITE)
  stockBatches() {
    return this.storage.listBatches();
  }

  @Post("stock-batches/:id/allocate")
  @RequirePermissions(permissions.STORAGE_WRITE)
  allocateBatch(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: StorageAllocationDto) {
    return this.storage.allocate(user.sub, id, dto);
  }

  @Get("location-balances")
  @RequirePermissions(permissions.LEDGER_READ)
  locationBalances(@Query() query: any) {
    return this.storage.locationBalances({ barcode: query.barcode });
  }

  @Get("items")
  @RequirePermissions(permissions.ITEM_READ)
  items(@Query() query: any) {
    return this.inventory.listItems(query);
  }

  @Get("items/:id")
  @RequirePermissions(permissions.ITEM_READ)
  itemDetail(@Param("id") id: string) {
    return this.inventory.itemDetail(id);
  }

  @Post("items")
  @RequirePermissions(permissions.ITEM_WRITE)
  createItem(@CurrentUser() user: any, @Body() dto: ItemDto) {
    return this.inventory.createItem(user.sub, dto);
  }

  @Post("items/import")
  @RequirePermissions(permissions.ITEM_WRITE)
  @UseInterceptors(FileInterceptor("file", { storage: diskStorage({ destination: tmpdir() }) }))
  async importItems(@CurrentUser() user: any, @UploadedFile() file: any) {
    try {
      return await this.inventory.importItemsFromExcel(user.sub, file?.path, file?.originalname);
    } finally {
      this.files.cleanupTemp(file);
    }
  }

  @Patch("items/:id")
  @RequirePermissions(permissions.ITEM_WRITE)
  updateItem(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: Partial<ItemDto>) {
    return this.inventory.updateItem(user.sub, id, dto);
  }

  @Patch("items/:id/files")
  @RequirePermissions(permissions.ITEM_WRITE)
  updateItemFiles(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: { photoFileId?: string; documentFileId?: string }) {
    return this.inventory.updateItemFiles(user.sub, id, dto);
  }

  @Get("items/:id/custody")
  @RequirePermissions(permissions.ITEM_READ)
  itemCustody(@Param("id") id: string) {
    return this.inventory.listAssetCustody(id);
  }

  @Post("items/:id/custody")
  @RequirePermissions(permissions.ITEM_WRITE)
  createItemCustody(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: AssetCustodyDto) {
    return this.inventory.createAssetCustody(user.sub, id, dto);
  }

  @Patch("asset-custody/:id")
  @RequirePermissions(permissions.ITEM_WRITE)
  updateItemCustody(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: Partial<AssetCustodyDto>) {
    return this.inventory.updateAssetCustody(user.sub, id, dto);
  }

  @Patch("asset-custody/:id/return")
  @RequirePermissions(permissions.ITEM_WRITE)
  returnItemCustody(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: { condition?: string; returnedAt?: string; notes?: string }) {
    return this.inventory.returnAssetCustody(user.sub, id, dto);
  }

  @Patch("items/:id/deactivate")
  @RequirePermissions(permissions.ITEM_DEACTIVATE)
  deactivateItem(@CurrentUser() user: any, @Param("id") id: string) {
    return this.inventory.deactivateItem(user.sub, id);
  }

  @Get("receipts")
  @RequireAnyPermission(permissions.RECEIPT_WRITE, permissions.INSPECTION_WRITE)
  receipts(@Query() query: any) {
    return this.receiving.listReceipts(query);
  }

  @Get("receipts/:id")
  @RequireAnyPermission(permissions.RECEIPT_WRITE, permissions.INSPECTION_WRITE)
  receiptDetail(@Param("id") id: string) {
    return this.receiving.findReceipt(id);
  }

  @Post("receipts")
  @RequirePermissions(permissions.RECEIPT_WRITE)
  createReceipt(@CurrentUser() user: any, @Body() dto: GrnDto) {
    return this.receiving.createGrn(user.sub, dto);
  }

  @Post("receipts/:id/submit")
  @RequirePermissions(permissions.RECEIPT_WRITE)
  submitReceipt(@CurrentUser() user: any, @Param("id") id: string) {
    return this.receiving.submitForInspection(user.sub, id);
  }

  @Post("receipts/lines/:id/inspect")
  @RequirePermissions(permissions.INSPECTION_WRITE)
  inspect(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: InspectDto) {
    return this.receiving.inspectLine(user.sub, id, dto);
  }

  @Get("ledger/balances")
  @RequirePermissions(permissions.LEDGER_READ)
  balances(@Query() query: any) {
    return this.ledger.balances({ itemId: query.itemId, locationId: query.locationId });
  }

  @Get("ledger/movements")
  @RequirePermissions(permissions.LEDGER_READ)
  movements(@Query() query: any) {
    return this.ledger.movements({ itemId: query.itemId, batchId: query.batchId });
  }

  @Get("issues")
  @RequireAnyPermission(permissions.REQUEST_CREATE, permissions.ISSUE_APPROVE, permissions.ISSUE_EXECUTE)
  issueRequests() {
    return this.issues.list();
  }

  @Post("issues")
  @RequirePermissions(permissions.REQUEST_CREATE)
  createIssue(@CurrentUser() user: any, @Body() dto: IssueDto) {
    return this.issues.create(user.sub, dto);
  }

  @Post("issues/:id/approve")
  @RequirePermissions(permissions.ISSUE_APPROVE)
  approveIssue(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.issues.decide(user.sub, id, true, body?.reason);
  }

  @Get("issues/:id/pick-list")
  @RequirePermissions(permissions.LEDGER_READ)
  issuePickList(@Param("id") id: string) {
    return this.issues.pickList(id);
  }

  @Post("issues/:id/reject")
  @RequirePermissions(permissions.ISSUE_APPROVE)
  rejectIssue(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.issues.decide(user.sub, id, false, body?.reason);
  }

  @Post("issues/:id/issue")
  @RequirePermissions(permissions.ISSUE_EXECUTE)
  executeIssue(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.issues.issueApproved(user.sub, id, body);
  }

  @Post("issues/:id/receive")
  @RequirePermissions(permissions.REQUEST_CREATE)
  receiveIssue(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.issues.acknowledgeReceipt(user.sub, id, body?.notes);
  }

  @Get("physical-counts")
  @RequirePermissions(permissions.COUNT_WRITE)
  physicalCounts() {
    return this.counts.list();
  }

  @Post("physical-counts")
  @RequirePermissions(permissions.COUNT_WRITE)
  openCount(@CurrentUser() user: any, @Body() body: { cycleType: CountCycleType; locationId?: string; categoryId?: string }) {
    return this.counts.open(user.sub, body);
  }

  @Post("physical-counts/:id/submit")
  @RequirePermissions(permissions.COUNT_WRITE)
  submitCount(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.counts.submit(user.sub, id, body);
  }

  @Get("adjustments")
  @RequirePermissions(permissions.ADJUSTMENT_APPROVE)
  adjustments() {
    return this.counts.adjustments();
  }

  @Post("adjustments/:id/approve")
  @RequirePermissions(permissions.ADJUSTMENT_APPROVE)
  approveAdjustment(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.counts.decideAdjustment(user.sub, id, true, body?.comment);
  }

  @Post("adjustments/:id/reject")
  @RequirePermissions(permissions.ADJUSTMENT_APPROVE)
  rejectAdjustment(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.counts.decideAdjustment(user.sub, id, false, body?.comment);
  }

  @Get("disposals")
  @RequireAnyPermission(permissions.DISPOSAL_WRITE, permissions.DISPOSAL_APPROVE)
  disposalList() {
    return this.disposals.list();
  }

  @Post("disposals")
  @RequirePermissions(permissions.DISPOSAL_WRITE)
  createDisposal(@CurrentUser() user: any, @Body() body: any) {
    return this.disposals.create(user.sub, body);
  }

  @Post("disposals/:id/approve")
  @RequirePermissions(permissions.DISPOSAL_APPROVE)
  approveDisposal(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.disposals.approve(user.sub, id, body);
  }

  @Post("disposals/:id/dispose")
  @RequirePermissions(permissions.DISPOSAL_WRITE)
  dispose(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) {
    return this.disposals.dispose(user.sub, id, body);
  }

  @Get("returns")
  @RequirePermissions(permissions.RETURN_READ)
  returnsList(@Query() query: any) {
    return this.returns.list(query);
  }

  @Get("returns/:id")
  @RequirePermissions(permissions.RETURN_READ)
  returnDetail(@Param("id") id: string) {
    return this.returns.findOne(id);
  }

  @Post("returns")
  @RequirePermissions(permissions.RETURN_CREATE)
  createReturn(@CurrentUser() user: any, @Body() dto: CreateReturnDto) {
    return this.returns.create(user.sub, dto);
  }

  @Post("returns/:id/inspect")
  @RequirePermissions(permissions.RETURN_INSPECT)
  inspectReturn(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: InspectReturnDto) {
    return this.returns.inspect(user.sub, id, dto);
  }

  @Get("approver/queue")
  @RequirePermissions(permissions.ISSUE_APPROVE)
  approverQueue() {
    return this.returns.getApproverQueue();
  }

  @Get("inspector/queue")
  @RequirePermissions(permissions.RETURN_INSPECT)
  inspectorQueue() {
    return this.returns.getInspectorQueue();
  }
}
