import {
    Controller,
    Get,
    Req,
    UnauthorizedException,
    UseGuards,
  } from "@nestjs/common";
  import { CognitoAuthGuard } from "./cognito.guard";
  import { PrismaService } from "../prisma.service";
  
  @Controller("auth")
  export class AuthController {
    constructor(private readonly prisma: PrismaService) {}
  
    /**
     * Ensures there is:
     *  - exactly one default Clinic (stable ID from env)
     *  - exactly one User row for the signed-in Cognito user (by cognitoSub)
     *
     * Returns the DB user + clinic info for debugging / app bootstrap.
     */
    @Get("ensure-user")
    @UseGuards(CognitoAuthGuard)
    async ensureUser(@Req() req: any) {
      const auth = req.auth;
  
      if (!auth?.sub || !auth?.email) {
        throw new UnauthorizedException("Missing auth info");
      }
  
      const { sub, email } = auth;
  
      const DEFAULT_CLINIC_ID = process.env.DEFAULT_CLINIC_ID;
      if (!DEFAULT_CLINIC_ID) {
        throw new Error("DEFAULT_CLINIC_ID env var is missing");
      }
  
      // Create-or-fetch the default clinic by stable ID (prevents duplicates forever)
      const clinic = await this.prisma.clinic.upsert({
        where: { id: DEFAULT_CLINIC_ID },
        update: {},
        create: {
          id: DEFAULT_CLINIC_ID,
          name: "Default Clinic",
        },
      });
  
      // Create-or-update the user by cognitoSub
      const user = await this.prisma.user.upsert({
        where: { cognitoSub: sub },
        update: {
          email,
          isActive: true,
          clinicId: clinic.id,
        },
        create: {
          cognitoSub: sub,
          email,
          clinicId: clinic.id,
          role: "ADMIN",
          isActive: true,
        },
      });
  
      return {
        ok: true,
        clinic: { id: clinic.id, name: clinic.name },
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId,
          cognitoSub: user.cognitoSub,
          isActive: user.isActive,
        },
        auth: {
          sub,
          email,
        },
      };
    }
  }
  