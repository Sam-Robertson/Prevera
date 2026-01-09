import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();


async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { name: "Demo Clinic" },
    update: {},
    create: { name: "Demo Clinic" },
  });

  const adminEmail = "admin@demo.local";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN, clinicId: clinic.id },
    create: {
      email: adminEmail,
      role: UserRole.ADMIN,
      clinicId: clinic.id,
      // cognitoSub stays null for now (until Cognito is wired)
    },
  });

  console.log({ clinic, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });