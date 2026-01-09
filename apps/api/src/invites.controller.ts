import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PrismaClient, UserRole, InviteStatus } from "@prisma/client";
import crypto from "crypto";
import { DevAuthGuard } from "./auth/dev-auth.guard";
import { Roles, RolesGuard } from "./auth/roles.guard";

const prisma = new PrismaClient();

@Controller("/invites")
export class InvitesController {
  @Post()
  @UseGuards(DevAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createInvite(
    @Req() req: any,
    @Body() body: { email: string; role?: UserRole }
  ) {
    const email = body.email?.toLowerCase().trim();
    const role = body.role ?? UserRole.STAFF;
    if (!email) throw new BadRequestException("email required");

    const user = req.user;
    if (!user?.clinicId) throw new BadRequestException("missing clinicId on user");

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await prisma.invite.create({
      data: {
        clinicId: user.clinicId,
        email,
        role,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { inviteId: invite.id, token };
  }

  @Post("/accept")
  async acceptInvite(@Body() body: { token: string }) {
    const token = body.token?.trim();
    if (!token) throw new BadRequestException("token required");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await prisma.invite.findUnique({ where: { tokenHash } });
    if (!invite) throw new BadRequestException("invalid token");
    if (invite.status !== InviteStatus.PENDING) throw new BadRequestException("invite not pending");
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
      data: { status: InviteStatus.ACCEPTED },
    });

    return { ok: true, userId: user.id, clinicId: user.clinicId, role: user.role };
  }
}
