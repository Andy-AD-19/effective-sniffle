import { BadRequestException, Controller, ForbiddenException, Get, Header, Param, Query } from "@nestjs/common";
import { permissions, reportTypes, roleReportTypes, ReportType, type RoleName } from "@fmoh/shared";
import { CurrentUser } from "./auth/current-user.decorator";
import { RequirePermissions } from "./auth/permissions.decorator";
import { ReportsService } from "./services/reports.service";

@Controller("reports")
@RequirePermissions(permissions.REPORT_READ)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(":type.xlsx")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  excel(@CurrentUser() user: any, @Param("type") type: ReportType, @Query() query: any) {
    this.assertType(type, user?.role);
    return this.reports.excel(type, { ...query, actorId: user?.sub });
  }

  @Get(":type.pdf")
  @Header("Content-Type", "application/pdf")
  pdf(@CurrentUser() user: any, @Param("type") type: ReportType, @Query() query: any) {
    this.assertType(type, user?.role);
    return this.reports.pdf(type, { ...query, actorId: user?.sub });
  }

  @Get(":type")
  data(@CurrentUser() user: any, @Param("type") type: ReportType, @Query() query: any) {
    this.assertType(type, user?.role);
    return this.reports.data(type, query);
  }

  private assertType(type: ReportType, role?: RoleName) {
    if (!reportTypes.includes(type)) throw new BadRequestException("Unknown report type");
    const allowed = role ? roleReportTypes[role] : undefined;
    if (!allowed?.includes(type)) throw new ForbiddenException("This report is not available for your role.");
  }
}
