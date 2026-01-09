
import { CognitoAuthGuard } from "./cognito.guard";
import { PrismaService } from "../prisma.service";
import { Controller, Get, Post, Req, UnauthorizedException, UseGuards, InternalServerErrorException } from "@nestjs/common";


@Controller("auth")
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  

private async ensureUserImpl(req: any) {
  try {
    const auth = req.auth;

    if (!auth?.sub || !auth?.email) {
      throw new UnauthorizedException("Missing auth info");
    }

    const { sub, email } = auth;

    const DEFAULT_CLINIC_ID = process.env.DEFAULT_CLINIC_ID;
    if (!DEFAULT_CLINIC_ID) {
      throw new Error("DEFAULT_CLINIC_ID env var is missing");
    }

    const clinic = await this.prisma.clinic.upsert({
      where: { id: DEFAULT_CLINIC_ID },
      update: {},
      create: { id: DEFAULT_CLINIC_ID, name: "Default Clinic" },
    });

    const user = await this.prisma.user.upsert({
      where: { cognitoSub: sub },
      update: { email, isActive: true, clinicId: clinic.id },
      create: { cognitoSub: sub, email, clinicId: clinic.id, role: "ADMIN", isActive: true },
    });

    return {
      ok: true,
      clinic: { id: clinic.id, name: clinic.name },
      user: { id: user.id, email: user.email, role: user.role, clinicId: user.clinicId, cognitoSub: user.cognitoSub, isActive: user.isActive },
      auth: { sub, email },
    };
  } catch (e: any) {
    console.error("ENSURE USER ERROR:", e);
    throw new InternalServerErrorException(e?.message ?? "ensure-user failed");
  }
}

  @Get("ensure-user")
  @UseGuards(CognitoAuthGuard)
  async ensureUserGet(@Req() req: any) {
    return this.ensureUserImpl(req);
  }

  @Post("ensure-user")
  @UseGuards(CognitoAuthGuard)
  async ensureUserPost(@Req() req: any) {
    return this.ensureUserImpl(req);
  }
}

