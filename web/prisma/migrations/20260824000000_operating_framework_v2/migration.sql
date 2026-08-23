CREATE TYPE "ZProjectType" AS ENUM ('INTERNAL_CLINIC', 'DISTRIBUTION', 'PARTNERSHIP', 'SERVICE', 'OTHER');
CREATE TYPE "ZProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ZMemberPreset" AS ENUM ('PROJECT_ADMIN', 'FINANCE', 'INVENTORY', 'SALES', 'VIEWER', 'CUSTOM');
CREATE TYPE "ZUnitType" AS ENUM ('DEPARTMENT', 'TEAM', 'FUNCTION');
CREATE TYPE "ZAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED');
CREATE TYPE "ZMechanismKind" AS ENUM ('COMMISSION', 'DISCOUNT', 'REVENUE_SHARE', 'BONUS', 'RANK', 'OTHER');
CREATE TYPE "ZMechanismStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED', 'SUPERSEDED');

CREATE TABLE "ZProject" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "projectType" "ZProjectType" NOT NULL DEFAULT 'OTHER', "status" "ZProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "ownerUserId" TEXT, "currency" TEXT NOT NULL DEFAULT 'VND', "enabledFeatures" JSONB, "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZProject_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZProjectMember" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "userId" TEXT NOT NULL, "preset" "ZMemberPreset" NOT NULL DEFAULT 'VIEWER',
  "permissions" JSONB, "active" BOOLEAN NOT NULL DEFAULT true, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZProjectMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZOrganizationUnit" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "parentId" TEXT, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "type" "ZUnitType" NOT NULL DEFAULT 'DEPARTMENT', "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZOrganizationUnit_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZProjectPosition" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "unitId" TEXT, "code" TEXT NOT NULL, "title" TEXT NOT NULL,
  "permissions" JSONB, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ZProjectPosition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZProjectAssignment" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "userId" TEXT NOT NULL, "positionId" TEXT NOT NULL,
  "status" "ZAssignmentStatus" NOT NULL DEFAULT 'ACTIVE', "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endsAt" TIMESTAMP(3),
  CONSTRAINT "ZProjectAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZMechanismDefinition" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "kind" "ZMechanismKind" NOT NULL, "description" TEXT, "status" "ZMechanismStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZMechanismDefinition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZMechanismVersion" (
  "id" TEXT NOT NULL, "definitionId" TEXT NOT NULL, "version" INTEGER NOT NULL, "status" "ZMechanismStatus" NOT NULL DEFAULT 'DRAFT',
  "inputSchema" JSONB NOT NULL, "ruleSpec" JSONB NOT NULL, "testCases" JSONB, "assumptions" JSONB,
  "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3), "createdById" TEXT NOT NULL, "approvedById" TEXT, "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZMechanismVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ZProject_code_key" ON "ZProject"("code");
CREATE UNIQUE INDEX "ZProjectMember_projectId_userId_key" ON "ZProjectMember"("projectId", "userId");
CREATE INDEX "ZProjectMember_userId_active_idx" ON "ZProjectMember"("userId", "active");
CREATE UNIQUE INDEX "ZOrganizationUnit_projectId_code_key" ON "ZOrganizationUnit"("projectId", "code");
CREATE UNIQUE INDEX "ZProjectPosition_projectId_code_key" ON "ZProjectPosition"("projectId", "code");
CREATE INDEX "ZProjectAssignment_projectId_status_idx" ON "ZProjectAssignment"("projectId", "status");
CREATE INDEX "ZProjectAssignment_userId_status_idx" ON "ZProjectAssignment"("userId", "status");
CREATE UNIQUE INDEX "ZMechanismDefinition_projectId_code_key" ON "ZMechanismDefinition"("projectId", "code");
CREATE UNIQUE INDEX "ZMechanismVersion_definitionId_version_key" ON "ZMechanismVersion"("definitionId", "version");
CREATE INDEX "ZMechanismVersion_definitionId_status_idx" ON "ZMechanismVersion"("definitionId", "status");
ALTER TABLE "ZProjectMember" ADD CONSTRAINT "ZProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZOrganizationUnit" ADD CONSTRAINT "ZOrganizationUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZOrganizationUnit" ADD CONSTRAINT "ZOrganizationUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ZOrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZProjectPosition" ADD CONSTRAINT "ZProjectPosition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZProjectPosition" ADD CONSTRAINT "ZProjectPosition_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ZOrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZProjectAssignment" ADD CONSTRAINT "ZProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZProjectAssignment" ADD CONSTRAINT "ZProjectAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "ZProjectPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZMechanismDefinition" ADD CONSTRAINT "ZMechanismDefinition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZMechanismVersion" ADD CONSTRAINT "ZMechanismVersion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ZMechanismDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
