import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { prisma, Prisma } from "@prior-auth/db";
import { CognitoAuthGuard } from "../auth/cognito.guard";

@Controller("patients")
@UseGuards(CognitoAuthGuard)
export class PatientsController {
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      firstName: string;
      lastName: string;
      dob?: string;
      status?: "ACTIVE" | "INACTIVE";
    },
  ) {
    try {
      const sub = req?.auth?.sub;
      if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

      const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
      if (!user) throw new UnauthorizedException("No user found for cognitoSub");

      const firstName = (body.firstName ?? "").trim();
      const lastName = (body.lastName ?? "").trim();
      if (!firstName || !lastName) {
        throw new BadRequestException("firstName and lastName required");
      }

      const dobStr = (body.dob ?? "").trim();
      const dob = dobStr ? new Date(dobStr) : null;
      if (dob && Number.isNaN(dob.getTime())) {
        throw new BadRequestException("Invalid dob. Use YYYY-MM-DD");
      }

      const status = body.status ?? "ACTIVE";

      return await prisma.patient.create({
        data: { clinicId: user.clinicId, firstName, lastName, dob, status },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dob: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      if (e?.getStatus) throw e;
      console.error("CREATE PATIENT ERROR", e);
      throw new InternalServerErrorException(e?.message ?? "Create patient failed");
    }
  }

  @Get()
  async list(
    @Req() req: any,
    @Query("q") q?: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE",
    @Query("sort") sort?: "name_asc" | "created_desc",
    @Query("take") takeRaw?: string,
    @Query("cursor") cursor?: string,
  ) {
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    const take = takeRaw ? Number(takeRaw) : 100;
    if (!Number.isFinite(take) || take < 1 || take > 500) {
      throw new BadRequestException("take must be between 1 and 500");
    }

    const where: Prisma.PatientWhereInput = {
      clinicId: user.clinicId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const trimmed = (q ?? "").trim();
    if (trimmed) {
      where.OR = [
        { firstName: { contains: trimmed, mode: "insensitive" } },
        { lastName: { contains: trimmed, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.PatientOrderByWithRelationInput[] =
      sort === "name_asc"
        ? [{ lastName: "asc" }, { firstName: "asc" }]
        : [{ createdAt: "desc" }, { lastName: "asc" }, { firstName: "asc" }];

    const rows = await prisma.patient.findMany({
      where,
      orderBy,
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dob: true,
        status: true,
        createdAt: true,
      },
    });

    const nextCursor = rows.length === take ? rows[rows.length - 1]?.id : null;
    return { items: rows, nextCursor };
  }

  @Get(":id")
  async getOne(@Req() req: any, @Param("id") id: string) {
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    const raw = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        clinicId: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        dob: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!raw) throw new NotFoundException("Patient not found: missing id");
    if (raw.deletedAt) throw new NotFoundException("Patient not found: deleted");
    if (raw.clinicId !== user.clinicId) {
      // dev-only helpful message
      throw new NotFoundException(
        `Patient not found: clinic mismatch (patient.clinicId=${raw.clinicId}, user.clinicId=${user.clinicId})`,
      );
    }

    return raw;
  }

}
