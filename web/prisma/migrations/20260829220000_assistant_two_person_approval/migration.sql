-- MC-21: two-person approval thật cho hành động L5 của AI dispatcher legacy
-- (vd delete_customer) — trước đây các hành động này bị chặn cứng hoàn toàn vì
-- chưa có luồng 2 người. Additive-only, không đổi/xóa dữ liệu hiện có.

ALTER TYPE "AssistantApprovalStatus" ADD VALUE IF NOT EXISTS 'PENDING_SECOND';

ALTER TABLE "AssistantApproval" ADD COLUMN IF NOT EXISTS "firstApprovedById" TEXT;
ALTER TABLE "AssistantApproval" ADD COLUMN IF NOT EXISTS "firstApprovedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "AssistantApproval"
    ADD CONSTRAINT "AssistantApproval_firstApprovedById_fkey"
    FOREIGN KEY ("firstApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "AssistantApproval_status_firstApprovedById_idx" ON "AssistantApproval"("status", "firstApprovedById");
