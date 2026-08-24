CREATE TYPE "ZWorkspaceTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "ZWorkspaceTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "PlanTaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "ZWorkspaceTaskPriority" NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3),
  "order" INTEGER NOT NULL DEFAULT 0,
  "assigneeId" TEXT,
  "createdById" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZWorkspaceTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZWorkspaceTask_projectId_status_order_idx" ON "ZWorkspaceTask"("projectId", "status", "order");
CREATE INDEX "ZWorkspaceTask_projectId_dueAt_idx" ON "ZWorkspaceTask"("projectId", "dueAt");
CREATE INDEX "ZWorkspaceTask_projectId_assigneeId_idx" ON "ZWorkspaceTask"("projectId", "assigneeId");

ALTER TABLE "ZWorkspaceTask" ADD CONSTRAINT "ZWorkspaceTask_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceTask" ADD CONSTRAINT "ZWorkspaceTask_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceTask" ADD CONSTRAINT "ZWorkspaceTask_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
