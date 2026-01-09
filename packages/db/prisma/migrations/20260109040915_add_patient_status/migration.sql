-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE';
