import { Controller, Get } from "@nestjs/common";
import { permissions } from "@fmoh/shared";
import { RequirePermissions } from "./auth/permissions.decorator";
import { DashboardService } from "./services/dashboard.service";

@Controller("dashboard")
@RequirePermissions(permissions.DASHBOARD_READ)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary() {
    return this.dashboard.summary();
  }
}
