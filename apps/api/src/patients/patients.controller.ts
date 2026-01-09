import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { prisma } from "@prior-auth/db";
import { CognitoAuthGuard } from "../auth/cognito.guard";

@Controller("patients")
@UseGuards(CognitoAuthGuard)
export class PatientsController {
  @Post()
  async create(
    @Req() req: any,
    @Body() body: { firstName: string; lastName: string; dob?: string },
  ) {
    try {
      const sub = req?.auth?.sub;
      if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

      const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
      if (!user) throw new UnauthorizedException("No user found for cognitoSub");

      const firstName = (body.firstName ?? "").trim();
      const lastName = (body.lastName ?? "").trim();
      if (!firstName || !lastName) throw new BadRequestException("firstName and lastName required");

      const dobStr = (body.dob ?? "").trim();
      const dob = dobStr ? new Date(dobStr) : null;
      if (dob && Number.isNaN(dob.getTime())) throw new BadRequestException("Invalid dob. Use YYYY-MM-DD");

      return await prisma.patient.create({
        data: { clinicId: user.clinicId, firstName, lastName, dob },
        select: { id: true, firstName: true, lastName: true, dob: true, createdAt: true },
      });
    } catch (e: any) {
      // Bubble known HTTP errors as-is
      if (e?.getStatus) throw e;

      // Prisma errors usually have "code" and "meta"
      console.error("CREATE PATIENT ERROR", e);

      throw new InternalServerErrorException(
        e?.message ?? e?.toString?.() ?? "Create patient failed",
      );
    }
  }

  @Get()
  async list(@Req() req: any) {
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    return prisma.patient.findMany({
      where: { clinicId: user.clinicId, deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, dob: true, createdAt: true },
    });
  }
}
