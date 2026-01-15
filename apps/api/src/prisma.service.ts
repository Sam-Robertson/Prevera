import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prior-auth/db";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      console.error("Prisma failed to connect. API will start but DB-backed routes may fail.");
      console.error(err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
