\set ON_ERROR_STOP on
BEGIN;

INSERT INTO "ZProject" ("id", "code", "name", "projectType", "status", "currency", "enabledFeatures", "settings", "createdAt", "updatedAt")
VALUES
  ('isolation-project-a', 'QA-ISO-A', 'QA Isolation A', 'OTHER', 'DRAFT', 'VND', '["tasks"]'::jsonb, '{"test":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('isolation-project-b', 'QA-ISO-B', 'QA Isolation B', 'OTHER', 'DRAFT', 'VND', '["tasks"]'::jsonb, '{"test":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "ZWorkspaceTask" ("id", "projectId", "title", "status", "priority", "order", "createdById", "createdAt", "updatedAt")
SELECT 'isolation-task-a', 'isolation-project-a', 'Task A only', 'TODO'::"PlanTaskStatus", 'NORMAL'::"ZWorkspaceTaskPriority", 0, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" ORDER BY "createdAt" LIMIT 1;
INSERT INTO "ZWorkspaceTask" ("id", "projectId", "title", "status", "priority", "order", "createdById", "createdAt", "updatedAt")
SELECT 'isolation-task-b', 'isolation-project-b', 'Task B only', 'TODO'::"PlanTaskStatus", 'NORMAL'::"ZWorkspaceTaskPriority", 0, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" ORDER BY "createdAt" LIMIT 1;

SELECT CASE
  WHEN (SELECT count(*) FROM "ZWorkspaceTask" WHERE "projectId" = 'isolation-project-a') = 1
   AND (SELECT count(*) FROM "ZWorkspaceTask" WHERE "projectId" = 'isolation-project-b') = 1
   AND (SELECT count(*) FROM "ZWorkspaceTask" WHERE "projectId" = 'isolation-project-a' AND "title" = 'Task B only') = 0
   AND (SELECT count(*) FROM "ZWorkspaceTask" WHERE "projectId" = 'isolation-project-b' AND "title" = 'Task A only') = 0
  THEN 'TASK_ISOLATION_PASS'
  ELSE 'TASK_ISOLATION_FAIL'
END;

ROLLBACK;
