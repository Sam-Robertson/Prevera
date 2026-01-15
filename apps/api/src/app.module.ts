import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { InvitesController } from "./invites.controller";
import { PatientsController } from "./patients/patients.controller";
import { PatientNotesController } from "./patients/patient-notes.controller";
import { AuthController } from "./auth/auth.controller";
import { PrismaService } from "./prisma.service";
import { AdminClinicsController } from "./admin/clinics.controller";
import { AdminUsersController } from "./admin/users.controller";
import { SesService } from "./email/ses.service";

@Module({
  controllers: [AppController, AuthController, InvitesController, PatientsController, PatientNotesController, AdminClinicsController, AdminUsersController],
  providers: [PrismaService, SesService],
})
export class AppModule {}
