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
  appointment_a TEXT := 'qa-appointment-a-' || substr(md5(random()::text), 1, 10);
  appointment_b TEXT := 'qa-appointment-b-' || substr(md5(random()::text), 1, 10);
  sale_a TEXT := 'qa-sale-a-' || substr(md5(random()::text), 1, 10);
  sale_b TEXT := 'qa-sale-b-' || substr(md5(random()::text), 1, 10);
  ledger_a TEXT := 'qa-ledger-a-' || substr(md5(random()::text), 1, 10);
  ledger_b TEXT := 'qa-ledger-b-' || substr(md5(random()::text), 1, 10);
  mechanism_a TEXT := 'qa-mechanism-a-' || substr(md5(random()::text), 1, 10);
  mechanism_version_a TEXT := 'qa-mechanism-version-a-' || substr(md5(random()::text), 1, 10);
  payroll_run_a TEXT := 'qa-payroll-run-a-' || substr(md5(random()::text), 1, 10);
  payroll_line_a TEXT := 'qa-payroll-line-a-' || substr(md5(random()::text), 1, 10);
  legacy_before BIGINT;
  legacy_appointment_before BIGINT;
  scoped_a BIGINT;
  scoped_b BIGINT;
BEGIN
  SELECT "id" INTO actor_id FROM "User" WHERE "role" = 'ADMIN' LIMIT 1;
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'No ADMIN test actor found';
  END IF;

  SELECT count(*) INTO legacy_before FROM "Customer";
  SELECT count(*) INTO legacy_appointment_before FROM "Appointment";

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

  INSERT INTO "ZWorkspaceAppointment" ("id", "projectId", "customerId", "scheduledAt", "type", "status", "createdById", "createdAt", "updatedAt")
  VALUES
    (appointment_a, project_a, customer_a, now() + interval '1 day', 'NEW', 'BOOKED', actor_id, now(), now()),
    (appointment_b, project_b, customer_b, now() + interval '2 days', 'FOLLOW_UP', 'CONFIRMED', actor_id, now(), now());

  IF (SELECT count(*) FROM "ZWorkspaceAppointment" WHERE "projectId" = project_a AND "customerId" = customer_b) <> 0 THEN
    RAISE EXCEPTION 'Cross-project appointment/customer link leaked into project A';
  END IF;
  IF (SELECT count(*) FROM "Appointment") <> legacy_appointment_before THEN
    RAISE EXCEPTION 'Legacy Appointment table changed during project-local test';
  END IF;

  INSERT INTO "ZWorkspaceSale" ("id", "projectId", "customerId", "code", "serviceName", "amount", "paidAmount", "status", "occurredAt", "createdById", "createdAt", "updatedAt")
  VALUES
    (sale_a, project_a, customer_a, 'SALE-A-001', 'QA Service A', 100000, 100000, 'PAID', now(), actor_id, now(), now()),
    (sale_b, project_b, customer_b, 'SALE-B-001', 'QA Service B', 200000, 0, 'CONFIRMED', now(), actor_id, now(), now());

  INSERT INTO "ZWorkspaceLedgerEntry" ("id", "projectId", "saleId", "code", "direction", "status", "category", "description", "amount", "occurredAt", "createdById", "createdAt", "updatedAt")
  VALUES
    (ledger_a, project_a, sale_a, 'LEDGER-A-001', 'INCOME', 'POSTED', 'SALE', 'QA ledger A', 100000, now(), actor_id, now(), now()),
    (ledger_b, project_b, sale_b, 'LEDGER-B-001', 'INCOME', 'POSTED', 'SALE', 'QA ledger B', 200000, now(), actor_id, now(), now());

  IF (SELECT count(*) FROM "ZWorkspaceLedgerEntry" WHERE "projectId" = project_a AND "saleId" = sale_b) <> 0 THEN
    RAISE EXCEPTION 'Cross-project ledger/sale link leaked into project A';
  END IF;
  IF (SELECT count(*) FROM "ZWorkspaceLedgerEntry" WHERE "projectId" = project_a) <> 1 OR (SELECT count(*) FROM "ZWorkspaceLedgerEntry" WHERE "projectId" = project_b) <> 1 THEN
    RAISE EXCEPTION 'Workspace ledger scope mismatch';
  END IF;

  INSERT INTO "ZMechanismDefinition" ("id", "projectId", "code", "name", "kind", "status", "createdAt", "updatedAt")
  VALUES (mechanism_a, project_a, 'QA-COMMISSION-A', 'QA Commission A', 'COMMISSION', 'ACTIVE', now(), now());
  INSERT INTO "ZMechanismVersion" ("id", "definitionId", "version", "status", "inputSchema", "ruleSpec", "createdById", "approvedById", "approvedAt", "effectiveFrom", "createdAt", "updatedAt")
  VALUES (mechanism_version_a, mechanism_a, 1, 'ACTIVE', '{"type":"object"}'::jsonb, '{"basis":"SALE_PAID","rateBps":1000,"allocation":"EQUAL_ACTIVE_MEMBERS"}'::jsonb, actor_id, actor_id, now(), now(), now(), now());
  INSERT INTO "ZWorkspacePayrollRun" ("id", "projectId", "mechanismVersionId", "code", "periodStart", "periodEnd", "status", "mechanismSnapshot", "createdById", "createdAt", "updatedAt")
  VALUES (payroll_run_a, project_a, mechanism_version_a, 'QA-PAYROLL-A', current_date, current_date, 'DRAFT', '{"projectId":"project-a","ruleSpec":{"basis":"SALE_PAID","rateBps":1000,"allocation":"EQUAL_ACTIVE_MEMBERS"}}'::jsonb, actor_id, now(), now());
  INSERT INTO "ZWorkspacePayrollLine" ("id", "runId", "projectId", "userId", "status", "grossAmount", "commissionAmount", "deductionAmount", "netAmount", "snapshot", "createdAt", "updatedAt")
  VALUES (payroll_line_a, payroll_run_a, project_a, actor_id, 'CALCULATED', 0, 0, 0, 0, '{"projectId":"project-a","basis":"PENDING_CALCULATION"}'::jsonb, now(), now());

  IF (SELECT count(*) FROM "ZWorkspacePayrollRun" WHERE "projectId" = project_a AND "id" = payroll_run_a) <> 1 THEN
    RAISE EXCEPTION 'Workspace payroll run scope mismatch';
  END IF;
  IF (SELECT count(*) FROM "ZWorkspacePayrollRun" WHERE "projectId" = project_b AND "id" = payroll_run_a) <> 0 THEN
    RAISE EXCEPTION 'Cross-project payroll run leaked into project B';
  END IF;
  IF (SELECT count(*) FROM "ZWorkspacePayrollLine" WHERE "projectId" = project_a AND "runId" = payroll_run_a) <> 1 THEN
    RAISE EXCEPTION 'Workspace payroll line scope mismatch';
  END IF;
  IF (SELECT count(*) FROM "ZWorkspacePayrollLine" WHERE "projectId" = project_b AND "runId" = payroll_run_a) <> 0 THEN
    RAISE EXCEPTION 'Cross-project payroll line leaked into project B';
  END IF;

  RAISE NOTICE 'WORKSPACE_CORE_ISOLATION_PASS';
END $$;

ROLLBACK;
