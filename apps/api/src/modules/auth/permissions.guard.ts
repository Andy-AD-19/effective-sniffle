import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from "./permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredAll?.length && !requiredAny?.length) return true;
    const user = context.switchToHttp().getRequest().user;
    const granted = Array.isArray(user?.permissions) ? user.permissions : [];
    const hasAll = !requiredAll?.length || requiredAll.every((permission) => granted.includes(permission));
    const hasAny = !requiredAny?.length || requiredAny.some((permission) => granted.includes(permission));
    return hasAll && hasAny;
  }
}
