import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";

export type ClinicRole = "OWNER" | "ADMIN" | "STAFF";

export const ROLES_KEY = "roles";
export const Roles = (...roles: ClinicRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException("No user on request");

    const handler = context.getHandler();
    const roles: ClinicRole[] = Reflect.getMetadata(ROLES_KEY, handler) ?? [];
    if (roles.length === 0) return true;

    if (!roles.includes((user as any).role)) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
