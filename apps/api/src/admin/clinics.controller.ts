import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { prisma } from "@prior-auth/db";
import { CognitoAuthGuard } from "../auth/cognito.guard";
import { AuthUserGuard } from "../auth/auth-user.guard";
import { PlatformRoles, PlatformRolesGuard } from "../auth/platform-roles.guard";

@Controller("admin/clinics")
@UseGuards(CognitoAuthGuard, AuthUserGuard, PlatformRolesGuard)
export class AdminClinicsController {
  @Get()
  @PlatformRoles("SUPER_ADMIN")
  async list() {
    return prisma.clinic.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 500,
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  }

  @Post()
  @PlatformRoles("SUPER_ADMIN")
  async create(@Body() body: { name: string }) {
    const name = (body.name ?? "").trim();
    if (!name) throw new BadRequestException("name required");

    return prisma.clinic.create({
      data: { name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  }

  @Delete(":id")
  @PlatformRoles("SUPER_ADMIN")
  async delete(@Param("id") id: string) {
    const clinic = await prisma.clinic.findUnique({ where: { id }, select: { id: true } });
    if (!clinic) throw new NotFoundException("Clinic not found");

    const deps = await prisma.$transaction([
      prisma.user.count({ where: { clinicId: id } }),
      prisma.patient.count({ where: { clinicId: id } }),
      prisma.record.count({ where: { clinicId: id } }),
      prisma.invite.count({ where: { clinicId: id } }),
    ]);

    const [users, patients, records, invites] = deps;
    if (users || patients || records || invites) {
      throw new BadRequestException("Clinic is not empty");
    }

    await prisma.clinic.delete({ where: { id }, select: { id: true } });
    return { ok: true };
  }
}
