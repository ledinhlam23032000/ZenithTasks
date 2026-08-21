-- Safe additive migration: stores editable print-only overrides for consultation sheets.
-- Clinical source fields remain unchanged.
ALTER TABLE "ConsultationRecord" ADD COLUMN "printOverrides" JSONB;
