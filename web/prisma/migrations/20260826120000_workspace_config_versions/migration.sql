-- Additive only: versioned project configuration foundation.
-- Does not alter legacy clinic tables or grant permissions.

CREATE TYPE "ZWorkspaceConfigKind" AS ENUM ('MODULES', 'LAYOUT', 'SETTINGS');
CREATE TYPE "ZWorkspaceConfigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ROLLED_BACK');

CREATE TABLE "ZWorkspaceConfigVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ZWorkspaceConfigKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ZWorkspaceConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "note" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspaceConfigVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZWorkspaceConfigVersion_projectId_kind_version_key"
  ON "ZWorkspaceConfigVersion"("projectId", "kind", "version");
CREATE INDEX "ZWorkspaceConfigVersion_projectId_kind_status_idx"
  ON "ZWorkspaceConfigVersion"("projectId", "kind", "status");
CREATE INDEX "ZWorkspaceConfigVersion_projectId_effectiveFrom_idx"
  ON "ZWorkspaceConfigVersion"("projectId", "effectiveFrom");

ALTER TABLE "ZWorkspaceConfigVersion" ADD CONSTRAINT "ZWorkspaceConfigVersion_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceConfigVersion" ADD CONSTRAINT "ZWorkspaceConfigVersion_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceConfigVersion" ADD CONSTRAINT "ZWorkspaceConfigVersion_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
