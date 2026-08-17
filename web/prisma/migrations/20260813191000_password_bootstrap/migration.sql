ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts predate the bootstrap flow. Require one explicit password
-- change after the upgrade so a legacy/demo password cannot remain active.
UPDATE "User" SET "mustChangePassword" = true;
