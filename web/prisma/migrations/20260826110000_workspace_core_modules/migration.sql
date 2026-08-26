-- Additive only: first project-local operational records.
-- Deliberately separate from legacy Customer, Appointment, Payment and CashTransaction.

CREATE TYPE "ZWorkspaceSaleStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED');

CREATE TABLE "ZWorkspaceCustomer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneLast4" TEXT,
    "source" TEXT,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspaceCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZWorkspaceAppointment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'NEW',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "serviceInterest" TEXT,
    "note" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspaceAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZWorkspaceSale" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT,
    "code" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "paidAmount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "status" "ZWorkspaceSaleStatus" NOT NULL DEFAULT 'DRAFT',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspaceSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZWorkspaceCustomer_projectId_code_key" ON "ZWorkspaceCustomer"("projectId", "code");
CREATE INDEX "ZWorkspaceCustomer_projectId_fullName_idx" ON "ZWorkspaceCustomer"("projectId", "fullName");
CREATE INDEX "ZWorkspaceCustomer_projectId_active_idx" ON "ZWorkspaceCustomer"("projectId", "active");

CREATE INDEX "ZWorkspaceAppointment_projectId_scheduledAt_idx" ON "ZWorkspaceAppointment"("projectId", "scheduledAt");
CREATE INDEX "ZWorkspaceAppointment_projectId_status_idx" ON "ZWorkspaceAppointment"("projectId", "status");
CREATE INDEX "ZWorkspaceAppointment_projectId_customerId_idx" ON "ZWorkspaceAppointment"("projectId", "customerId");

CREATE UNIQUE INDEX "ZWorkspaceSale_projectId_code_key" ON "ZWorkspaceSale"("projectId", "code");
CREATE INDEX "ZWorkspaceSale_projectId_occurredAt_idx" ON "ZWorkspaceSale"("projectId", "occurredAt");
CREATE INDEX "ZWorkspaceSale_projectId_status_idx" ON "ZWorkspaceSale"("projectId", "status");

ALTER TABLE "ZWorkspaceCustomer" ADD CONSTRAINT "ZWorkspaceCustomer_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceCustomer" ADD CONSTRAINT "ZWorkspaceCustomer_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ZWorkspaceAppointment" ADD CONSTRAINT "ZWorkspaceAppointment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceAppointment" ADD CONSTRAINT "ZWorkspaceAppointment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "ZWorkspaceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceAppointment" ADD CONSTRAINT "ZWorkspaceAppointment_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceAppointment" ADD CONSTRAINT "ZWorkspaceAppointment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ZWorkspaceSale" ADD CONSTRAINT "ZWorkspaceSale_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceSale" ADD CONSTRAINT "ZWorkspaceSale_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "ZWorkspaceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceSale" ADD CONSTRAINT "ZWorkspaceSale_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
