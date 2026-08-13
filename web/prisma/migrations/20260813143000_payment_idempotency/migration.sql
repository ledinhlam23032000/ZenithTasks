ALTER TABLE "Payment" ADD COLUMN "clientNonce" TEXT;

CREATE UNIQUE INDEX "Payment_clientNonce_key" ON "Payment"("clientNonce");
