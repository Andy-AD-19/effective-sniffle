import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { DashboardController } from "./dashboard.controller";
import { DomainController } from "./domain.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ReportsController } from "./reports.controller";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { PermissionsGuard } from "./auth/permissions.guard";
import { AuditService } from "./services/audit.service";
import { DashboardService } from "./services/dashboard.service";
import { DisposalService } from "./services/disposal.service";
import { InventoryService } from "./services/inventory.service";
import { LedgerService } from "./services/ledger.service";
import { IssueService } from "./services/issue.service";
import { PhysicalCountService } from "./services/physical-count.service";
import { ReceivingService } from "./services/receiving.service";
import { ReportsService } from "./services/reports.service";
import { UsersService } from "./services/users.service";
import { MasterDataService } from "./services/master-data.service";
import { AuditQueryService } from "./services/audit-query.service";
import { NotificationsService } from "./services/notifications.service";
import { StorageService } from "./services/storage.service";
import { FileUploadService } from "./services/file-upload.service";
import { ReturnService } from "./services/return.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [DomainController, DashboardController, ReportsController],
  providers: [
    AuditService,
    InventoryService,
    ReceivingService,
    LedgerService,
    IssueService,
    ReturnService,
    DashboardService,
    PhysicalCountService,
    DisposalService,
    ReportsService,
    UsersService,
    MasterDataService,
    AuditQueryService,
    NotificationsService,
    StorageService,
    FileUploadService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard }
  ]
})
export class AppModule {}
