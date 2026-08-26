-- Rollback-only smoke test. Run against an isolated QA database or a deliberate transaction.
-- Never run with destructive reset commands and never print customer contents.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  actor_id TEXT;
  project_a TEXT := 'qa-core-a-' || substr(md5(random()::text), 1, 10);
  project_b TEXT := 'qa-core-b-' || substr(md5(random()::text), 1, 10);
  customer_a TEXT := 'qa-customer-a-' || substr(md5(random()::text), 1, 10);
  customer_b TEXT := 'qa-customer-b-' || substr(md5(random()::text), 1, 10);
  legacy_before BIGINT;
  scoped_a BIGINT;
  scoped_b BIGINT;
BEGIN
  SELECT "id" INTO actor_id FROM "User" WHERE "role" = 'ADMIN' LIMIT 1;
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'No ADMIN test actor found';
  END IF;

  SELECT count(*) INTO legacy_before FROM "Customer";

  INSERT INTO "ZProject" ("id", "code", "name", "projectType", "status", "currency", "createdAt", "updatedAt")
  VALUES
    (project_a, upper(project_a), 'QA Core A', 'SERVICE', 'ACTIVE', 'VND', now(), now()),
    (project_b, upper(project_b), 'QA Core B', 'SERVICE', 'ACTIVE', 'VND', now(), now());

  INSERT INTO "ZWorkspaceCustomer" ("id", "projectId", "code", "fullName", "phoneLast4", "active", "createdById", "createdAt", "updatedAt")
  VALUES
    (customer_a, project_a, 'KH-A-001', 'QA Customer A', '1001', true, actor_id, now(), now()),
    (customer_b, project_b, 'KH-B-001', 'QA Customer B', '2002', true, actor_id, now(), now());

  SELECT count(*) INTO scoped_a FROM "ZWorkspaceCustomer" WHERE "projectId" = project_a;
  SELECT count(*) INTO scoped_b FROM "ZWorkspaceCustomer" WHERE "projectId" = project_b;
  IF scoped_a <> 1 OR scoped_b <> 1 THEN
    RAISE EXCEPTION 'Workspace customer scope mismatch: %, %', scoped_a, scoped_b;
  END IF;

  IF (SELECT count(*) FROM "ZWorkspaceCustomer" WHERE "projectId" = project_a AND "code" = 'KH-B-001') <> 0 THEN
    RAISE EXCEPTION 'Cross-project customer leaked into project A';
  END IF;
  IF (SELECT count(*) FROM "Customer") <> legacy_before THEN
    RAISE EXCEPTION 'Legacy Customer table changed during project-local test';
  END IF;

  RAISE NOTICE 'WORKSPACE_CORE_ISOLATION_PASS';
END $$;

ROLLBACK;
