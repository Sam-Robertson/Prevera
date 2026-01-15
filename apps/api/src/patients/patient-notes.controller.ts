import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { prisma, RecordType } from "@prior-auth/db";
import { CognitoAuthGuard } from "../auth/cognito.guard";

@Controller("patients/:id/notes")
@UseGuards(CognitoAuthGuard)
export class PatientNotesController {
  @Get()
  async listNotes(@Req() req: any, @Param("id") id: string) {
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    const existing = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, clinicId: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt || existing.clinicId !== user.clinicId) {
      throw new NotFoundException("Patient not found");
    }

    return prisma.record.findMany({
      where: {
        clinicId: user.clinicId,
        patientId: id,
        deletedAt: null,
        type: RecordType.NOTE,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: { select: { id: true, email: true } },
      },
    });
  }

  @Post()
  async createNote(
    @Req() req: any,
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      body: string;
    },
  ) {
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    const existing = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, clinicId: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt || existing.clinicId !== user.clinicId) {
      throw new NotFoundException("Patient not found");
    }

    const title = (body.title ?? "").trim() || null;
    const noteBody = (body.body ?? "").trim();
    if (!noteBody) throw new BadRequestException("Note body is required");

    return prisma.record.create({
      data: {
        clinicId: user.clinicId,
        patientId: id,
        createdByUserId: user.id,
        type: RecordType.NOTE,
        title,
        body: noteBody,
      },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: { select: { id: true, email: true } },
      },
    });
  }

  @Patch(":noteId")
  async updateNote(
    @Req() req: any,
    @Param("id") id: string,
    @Param("noteId") noteId: string,
    @Body()
    body: {
      title?: string | null;
      body?: string;
    },
  ) {
    const sub = req?.auth?.sub;
    if (!sub) throw new UnauthorizedException("Missing req.auth.sub");

    const user = await prisma.user.findFirst({ where: { cognitoSub: sub } });
    if (!user) throw new UnauthorizedException("No user found for cognitoSub");

    const existingPatient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, clinicId: true, deletedAt: true },
    });
    if (
      !existingPatient ||
      existingPatient.deletedAt ||
      existingPatient.clinicId !== user.clinicId
    ) {
      throw new NotFoundException("Patient not found");
    }

    const existingNote = await prisma.record.findUnique({
      where: { id: noteId },
      select: { id: true, clinicId: true, patientId: true, deletedAt: true, type: true },
    });
    if (
      !existingNote ||
      existingNote.deletedAt ||
      existingNote.clinicId !== user.clinicId ||
      existingNote.patientId !== id ||
      existingNote.type !== RecordType.NOTE
    ) {
      throw new NotFoundException("Note not found");
    }

    const data: any = {};
    if (body.title !== undefined) {
      const t = body.title === null ? null : String(body.title).trim();
      data.title = t ? t : null;
    }
    if (body.body !== undefined) {
      const b = String(body.body).trim();
      if (!b) throw new BadRequestException("Note body is required");
      data.body = b;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No fields to update");
    }

    return prisma.record.update({
      where: { id: noteId },
      data,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: { select: { id: true, email: true } },
      },
    });
  }
}
