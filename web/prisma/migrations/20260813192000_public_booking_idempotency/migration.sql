ALTER TABLE "Appointment"
ADD COLUMN "publicNonce" TEXT;

CREATE UNIQUE INDEX "Appointment_publicNonce_key" ON "Appointment"("publicNonce");
