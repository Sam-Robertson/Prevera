CREATE TYPE "PlatformRole" AS ENUM ('NONE', 'SUPER_ADMIN');

ALTER TYPE "UserRole" RENAME VALUE 'MANAGER' TO 'OWNER';

ALTER TABLE "User" ADD COLUMN     "platformRole" "PlatformRole" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

ALTER TABLE "Invite" ADD COLUMN     "invitedByUserId" TEXT,
ADD COLUMN     "acceptedByUserId" TEXT,
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "revokedByUserId" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "sendCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
