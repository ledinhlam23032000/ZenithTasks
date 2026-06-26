-- Hồ sơ cộng tác viên
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "bankHolder" TEXT,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Collaborator_name_key" ON "Collaborator"("name");
