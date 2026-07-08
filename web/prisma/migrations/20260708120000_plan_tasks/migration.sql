-- Lập kế hoạch nội bộ dạng "task app" (Trợ Lý) — kế hoạch + nhiệm vụ chính/phụ tự tham chiếu.

CREATE TYPE "PlanTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Plan_createdAt_idx" ON "Plan"("createdAt");

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlanTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "status" "PlanTaskStatus" NOT NULL DEFAULT 'TODO',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanTask_planId_idx" ON "PlanTask"("planId");
CREATE INDEX "PlanTask_parentId_idx" ON "PlanTask"("parentId");

ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PlanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
