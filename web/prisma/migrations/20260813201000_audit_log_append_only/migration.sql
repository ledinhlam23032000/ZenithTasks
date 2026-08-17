-- Audit events are evidence, not editable business data. Prevent application
-- code (or a compromised admin session) from silently rewriting history.
CREATE OR REPLACE FUNCTION "audit_log_immutable"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$;

CREATE TRIGGER "AuditLog_append_only"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION "audit_log_immutable"();
