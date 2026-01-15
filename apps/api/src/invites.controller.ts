import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import crypto from "crypto";
import { prisma } from "@prior-auth/db";
import { CognitoAuthGuard } from "./auth/cognito.guard";
import { AuthUserGuard } from "./auth/auth-user.guard";
import { Roles, RolesGuard } from "./auth/roles.guard";
import { SesService } from "./email/ses.service";

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

@Controller("/invites")
export class InvitesController {
  constructor(private readonly ses: SesService) {}

  @Get()
  @UseGuards(CognitoAuthGuard, AuthUserGuard, RolesGuard)
  @Roles("OWNER", "ADMIN")
  async list(@Req() req: any) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new BadRequestException("missing clinicId on user");

    return prisma.invite.findMany({
      where: { clinicId },
      orderBy: [{ createdAt: "desc" }],
      take: 500,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        lastSentAt: true,
        sendCount: true,
      } as any,
    });
  }

  @Post()
  @UseGuards(CognitoAuthGuard, AuthUserGuard, RolesGuard)
  @Roles("OWNER", "ADMIN")
  async createInvite(
    @Req() req: any,
    @Body() body: { email: string; role?: "OWNER" | "ADMIN" | "STAFF"; expiresInDays?: number }
  ) {
    const email = normalizeEmail(body.email ?? "");
    const role = body.role ?? "STAFF";
    if (!email) throw new BadRequestException("email required");

    const user = req.user;
    if (!user?.clinicId) throw new BadRequestException("missing clinicId on user");

    const expiresInDays = body.expiresInDays ?? 7;
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 60) {
      throw new BadRequestException("expiresInDays must be between 1 and 60");
    }

    const token = makeToken();
    const tokenHash = hashToken(token);

    const clinic = await prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { id: true, name: true },
    });
    if (!clinic) throw new BadRequestException("invalid clinicId on user");

    const invite = await prisma.invite.create({
      data: {
        clinicId: user.clinicId,
        email,
        role: role as any,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        invitedByUserId: user.id,
        lastSentAt: new Date(),
        sendCount: 1,
      } as any,
    });

    const webBaseUrl = process.env.WEB_APP_BASE_URL ?? "";
    const inviteUrl = webBaseUrl ? `${webBaseUrl.replace(/\/$/, "")}/api/auth/invite?token=${token}` : token;

    if (process.env.SES_FROM_EMAIL) {
      await this.ses.sendInviteEmail({
        to: email,
        inviteUrl,
        clinicName: clinic.name,
        role,
      });
    }

    return { inviteId: invite.id, token, inviteUrl };
  }

  @Post(":id/resend")
  @UseGuards(CognitoAuthGuard, AuthUserGuard, RolesGuard)
  @Roles("OWNER", "ADMIN")
  async resend(@Req() req: any, @Param("id") id: string) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new BadRequestException("missing clinicId on user");

    const existing = await prisma.invite.findUnique({
      where: { id },
      select: { id: true, clinicId: true, email: true, role: true, status: true, expiresAt: true },
    });
    if (!existing || existing.clinicId !== clinicId) throw new NotFoundException("Invite not found");
    if (String(existing.status) !== "PENDING") {
      throw new BadRequestException("invite not pending");
    }

    const token = makeToken();
    const tokenHash = hashToken(token);

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } });

    await prisma.invite.update({
      where: { id },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastSentAt: new Date(),
        sendCount: { increment: 1 },
      } as any,
      select: { id: true },
    });

    const webBaseUrl = process.env.WEB_APP_BASE_URL ?? "";
    const inviteUrl = webBaseUrl ? `${webBaseUrl.replace(/\/$/, "")}/api/auth/invite?token=${token}` : token;

    if (process.env.SES_FROM_EMAIL) {
      await this.ses.sendInviteEmail({
        to: existing.email,
        inviteUrl,
        clinicName: clinic?.name ?? null,
        role: String(existing.role),
      });
    }

    return { ok: true, token, inviteUrl };
  }

  @Post(":id/revoke")
  @UseGuards(CognitoAuthGuard, AuthUserGuard, RolesGuard)
  @Roles("OWNER", "ADMIN")
  async revoke(@Req() req: any, @Param("id") id: string) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new BadRequestException("missing clinicId on user");

    const existing = await prisma.invite.findUnique({ where: { id }, select: { id: true, clinicId: true, status: true } });
    if (!existing || existing.clinicId !== clinicId) throw new NotFoundException("Invite not found");

    if (String(existing.status) !== "PENDING") {
      throw new BadRequestException("invite not pending");
    }

    await prisma.invite.update({
      where: { id },
      data: {
        status: "REVOKED" as any,
        revokedAt: new Date(),
        revokedByUserId: req.user.id,
      } as any,
      select: { id: true },
    });

    return { ok: true };
  }

  @Post("/accept")
  async acceptInvite(@Body() body: { token: string }) {
    const token = body.token?.trim();
    if (!token) throw new BadRequestException("token required");

    const tokenHash = hashToken(token);

    const invite = await prisma.invite.findUnique({ where: { tokenHash } });
    if (!invite) throw new BadRequestException("invalid token");
    if (String(invite.status) !== "PENDING") throw new BadRequestException("invite not pending");
    if (invite.expiresAt.getTime() < Date.now()) throw new BadRequestException("invite expired");

    // Create or update the user (invite-only onboarding)
    const user = await prisma.user.upsert({
      where: { email: invite.email },
      update: {
        clinicId: invite.clinicId,
        role: invite.role,
        isActive: true,
      },
      create: {
        email: invite.email,
        clinicId: invite.clinicId,
        role: invite.role,
        isActive: true,
      },
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" as any },
    });

    return { ok: true, userId: user.id, clinicId: user.clinicId, role: user.role };
  }

  @Post("/accept-auth")
  @UseGuards(CognitoAuthGuard)
  async acceptInviteAuthed(@Req() req: any, @Body() body: { token: string }) {
    const token = body.token?.trim();
    if (!token) throw new BadRequestException("token required");

    const sub = req?.auth?.sub;
    const email = req?.auth?.email;
    if (!sub || !email) throw new BadRequestException("missing auth sub/email");

    const tokenHash = hashToken(token);
    const invite = await prisma.invite.findUnique({ where: { tokenHash } });
    if (!invite) throw new BadRequestException("invalid token");
    if (String(invite.status) !== "PENDING") throw new BadRequestException("invite not pending");
    if (invite.expiresAt.getTime() < Date.now()) throw new BadRequestException("invite expired");

    if (normalizeEmail(invite.email) !== normalizeEmail(email)) {
      throw new BadRequestException("invite email does not match signed-in user");
    }

    const existingBySub = await prisma.user.findFirst({ where: { cognitoSub: sub }, select: { id: true, email: true } });
    if (existingBySub && normalizeEmail(existingBySub.email) !== normalizeEmail(invite.email)) {
      throw new BadRequestException("cognitoSub already linked to another user");
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email: normalizeEmail(invite.email) }, select: { id: true, cognitoSub: true } });
    if (existingByEmail?.cognitoSub && existingByEmail.cognitoSub !== sub) {
      throw new BadRequestException("email already linked to another Cognito user");
    }

    const user = await prisma.user.upsert({
      where: { email: normalizeEmail(invite.email) },
      update: {
        clinicId: invite.clinicId,
        role: invite.role as any,
        isActive: true,
        cognitoSub: sub,
      } as any,
      create: {
        email: normalizeEmail(invite.email),
        clinicId: invite.clinicId,
        role: invite.role as any,
        isActive: true,
        cognitoSub: sub,
      } as any,
      select: { id: true, clinicId: true, role: true, email: true, cognitoSub: true },
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED" as any,
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
      } as any,
      select: { id: true },
    });

    return { ok: true, userId: user.id, clinicId: user.clinicId, role: user.role };
  }
}
