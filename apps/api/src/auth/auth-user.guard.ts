import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@prior-auth/db";

@Injectable()
export class AuthUserGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    req.user = user as any;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() } as any,
      select: { id: true },
    });

    return true;
  }
}
