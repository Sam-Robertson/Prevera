-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastVisit" TIMESTAMP(3),
ADD COLUMN     "mrn" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE INDEX "Patient_clinicId_mrn_idx" ON "Patient"("clinicId", "mrn");

-- CreateIndex
CREATE INDEX "Patient_clinicId_email_idx" ON "Patient"("clinicId", "email");
