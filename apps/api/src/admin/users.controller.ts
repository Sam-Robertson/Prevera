import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { prisma } from "@prior-auth/db";
import { CognitoAuthGuard } from "../auth/cognito.guard";
import { AuthUserGuard } from "../auth/auth-user.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";

@Controller("admin/users")
@UseGuards(CognitoAuthGuard, AuthUserGuard, RolesGuard)
export class AdminUsersController {
  @Get()
  @Roles("OWNER", "ADMIN")
  async list(@Req() req: any) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new BadRequestException("Missing clinicId on user");

    return prisma.user.findMany({
      where: { clinicId },
      orderBy: [{ createdAt: "desc" }],
      take: 500,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastActiveAt: true,
        cognitoSub: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });
  }

  @Post(":id/remove")
  @Roles("OWNER", "ADMIN")
  async remove(@Req() req: any, @Param("id") id: string) {
    if (req.user?.id === id) {
      throw new BadRequestException("You cannot remove yourself");
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, clinicId: true, isActive: true },
    });

    if (!existing || existing.clinicId !== req.user?.clinicId) {
      throw new NotFoundException("User not found");
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });

    return { ok: true };
  }
}
