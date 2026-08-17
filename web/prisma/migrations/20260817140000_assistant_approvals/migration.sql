CREATE TYPE "AssistantApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

CREATE TABLE "AssistantApproval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "status" "AssistantApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AssistantApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantApproval_userId_status_idx" ON "AssistantApproval"("userId", "status");
CREATE INDEX "AssistantApproval_expiresAt_idx" ON "AssistantApproval"("expiresAt");

ALTER TABLE "AssistantApproval" ADD CONSTRAINT "AssistantApproval_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
