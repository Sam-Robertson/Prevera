import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";

export type PlatformRole = "NONE" | "SUPER_ADMIN";

export const PLATFORM_ROLES_KEY = "platform_roles";
export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException("No user on request");

    const handler = context.getHandler();
    const roles: PlatformRole[] = Reflect.getMetadata(PLATFORM_ROLES_KEY, handler) ?? [];
    if (roles.length === 0) return true;

    if (!roles.includes((user as any).platformRole)) {
      throw new ForbiddenException("Insufficient platform role");
    }
    return true;
  }
}
