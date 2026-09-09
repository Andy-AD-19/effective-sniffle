import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@fmoh/shared";

export const PERMISSIONS_KEY = "permissions";
export const ANY_PERMISSIONS_KEY = "anyPermissions";
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const RequireAnyPermission = (...permissions: Permission[]) => SetMetadata(ANY_PERMISSIONS_KEY, permissions);
