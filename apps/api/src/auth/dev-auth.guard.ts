import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Injectable()
export class DevAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const email = req.headers["x-dev-user-email"];
    if (!email || typeof email !== "string") {
      throw new UnauthorizedException("Missing x-dev-user-email header");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("User not found");

    req.user = user;
    return true;
  }
}
