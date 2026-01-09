import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { InvitesController } from "./invites.controller";
import { PatientsController } from "./patients/patients.controller";
import { AuthController } from "./auth/auth.controller";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [AppController, AuthController, InvitesController, PatientsController],
  providers: [PrismaService],
})
export class AppModule {}
