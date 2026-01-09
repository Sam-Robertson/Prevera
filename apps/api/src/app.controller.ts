import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { prisma } from "@prior-auth/db";
import { CognitoAuthGuard } from "./auth/cognito.guard";
import { DevJwtGuard } from "./auth/dev-jwt.guard";

@Controller()
export class AppController {
  @Get("/health")
  health() {
    return { ok: true };
  }

  @Get("/db-check")
  async dbCheck() {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    return { ok: true, result };
  }

  /**
   * ✅ REAL AUTH (kept as-is)
   * This is your production-grade route backed by CognitoAuthGuard
   */
  @Get("/me")
  @UseGuards(CognitoAuthGuard)
  async me(@Req() req: any) {
    const { sub, email } = req.auth;
    const user = await prisma.user.findFirst({
      where: { cognitoSub: sub },
    });

    return { sub, email, user };
  }

  /**
   * 🧪 DEV-ONLY AUTH PROOF
   * This is TEMPORARY and ONLY used to unblock frontend work.
   * It proves:
   *   Next.js → access_token → Authorization header → Nest
   */
  @Get("/whoami")
  @UseGuards(DevJwtGuard)
  whoami(@Req() req: any) {
    return {
      ok: true,
      user: req.user,
    };
  }
}
