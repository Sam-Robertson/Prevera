import {
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  InternalServerErrorException,
} from "@nestjs/common";
import { CognitoAuthGuard } from "./cognito.guard";
import { PrismaService } from "../prisma.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures there is:
   *  - a default Clinic (stable ID from env) without tripping unique(name)
   *  - a User row for the signed-in Cognito user (by cognitoSub)
   *
   * Supports both GET and POST for convenience.
   */
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

  private async ensureUserImpl(req: any) {
    try {
      const auth = req.auth;

      if (!auth?.sub || !auth?.email) {
        throw new UnauthorizedException("Missing auth info");
      }

      const { sub, email } = auth;

      const platformAdminEmailsRaw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
      const platformAdminEmails = platformAdminEmailsRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const isPlatformAdmin = platformAdminEmails.includes(String(email).toLowerCase());

      const DEFAULT_CLINIC_ID = process.env.DEFAULT_CLINIC_ID;
      if (!DEFAULT_CLINIC_ID) {
        throw new Error("DEFAULT_CLINIC_ID env var is missing");
      }

      // If Clinic.name is unique, creating "Default Clinic" with a new id will fail
      // if a prior row already exists with that name. So:
      // 1) prefer stable id
      // 2) fallback to existing by name
      // 3) create only if neither exist
      const DEFAULT_CLINIC_NAME = "Default Clinic";

      let clinic = await this.prisma.clinic.findUnique({
        where: { id: DEFAULT_CLINIC_ID },
        select: { id: true, name: true },
      });

      if (!clinic) {
        const byName = await this.prisma.clinic.findUnique({
          where: { name: DEFAULT_CLINIC_NAME },
          select: { id: true, name: true },
        });

        if (byName) {
          clinic = byName;
        } else {
          clinic = await this.prisma.clinic.create({
            data: { id: DEFAULT_CLINIC_ID, name: DEFAULT_CLINIC_NAME },
            select: { id: true, name: true },
          });
        }
      }

      // Create-or-update the user by cognitoSub
      const user = await this.prisma.user.upsert({
        where: { cognitoSub: sub },
        update: {
          email,
          isActive: true,
          clinicId: clinic.id,
          ...(isPlatformAdmin ? ({ platformRole: "SUPER_ADMIN" } as any) : {}),
        },
        create: {
          cognitoSub: sub,
          email,
          clinicId: clinic.id,
          role: "OWNER",
          ...(isPlatformAdmin ? ({ platformRole: "SUPER_ADMIN" } as any) : {}),
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          clinicId: true,
          cognitoSub: true,
          isActive: true,
          platformRole: true,
        } as any,
      });

      return {
        ok: true,
        clinic,
        user,
        auth: { sub, email },
      };
    } catch (e: any) {
      console.error("ENSURE USER ERROR:", e);
      throw new InternalServerErrorException(e?.message ?? "ensure-user failed");
    }
  }
}
