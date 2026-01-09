import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";

@Injectable()
export class DevJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) throw new UnauthorizedException("Missing bearer token");

    const decoded = jwt.decode(token);
    if (!decoded) throw new UnauthorizedException("Invalid token");

    req.user = decoded;
    return true;
  }
}
