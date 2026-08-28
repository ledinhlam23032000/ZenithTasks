-- 1) AuditLog: thêm index cho các cột thực sự được lọc.
--
-- Bảng này là append-only (trigger AuditLog_append_only chặn UPDATE/DELETE) và không
-- có cơ chế dọn/archive, nên chỉ lớn dần. Trước đây chỉ có @@index([at]) trong khi
-- /nhat-ky, /nhat-ky/export, /he-thong/ai-tong, system-status và trang chi tiết khách
-- V2 đều lọc theo entity/entityId/action/actorId -> Postgres quét ngược theo `at` cho
-- tới khi gom đủ dòng; với bộ lọc hiếm thì gần như quét toàn bảng. Route export còn
-- không có LIMIT. Đây là rủi ro khả dụng theo thời gian, không phải lộ dữ liệu.
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_at_idx" ON "AuditLog"("entity", "entityId", "at");
CREATE INDEX IF NOT EXISTS "AuditLog_action_at_idx" ON "AuditLog"("action", "at");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_at_idx" ON "AuditLog"("actorId", "at");

-- 2) ZAiAgent.code: đưa uniqueness về đúng phạm vi tenant.
--
-- Agent CHILD thuộc từng project (CHECK ZAiAgent_scope_check buộc CHILD có projectId)
-- nhưng code lại unique TOÀN CỤC. Hệ quả: công ty B không tạo được agent trùng code
-- công ty A đã dùng (lỗi chức năng + chiếm chỗ tên phổ biến), và thông báo "Mã AI đã
-- tồn tại trong hệ thống" để lộ agent của tenant khác có tồn tại hay không.
--
-- An toàn khi chạy: code đang unique toàn cục nên chắc chắn cũng unique theo
-- [projectId, code]; không có dữ liệu nào vi phạm ràng buộc mới.
DROP INDEX IF EXISTS "ZAiAgent_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ZAiAgent_projectId_code_key" ON "ZAiAgent"("projectId", "code");
-- Agent GLOBAL có projectId NULL; Postgres coi các NULL là khác nhau nên index trên
-- không chặn được hai agent GLOBAL trùng code. Partial unique index bù đúng chỗ đó.
-- (Prisma schema không diễn đạt được partial index nên chỉ khai ở migration.)
CREATE UNIQUE INDEX IF NOT EXISTS "ZAiAgent_global_code_key" ON "ZAiAgent"("code") WHERE "projectId" IS NULL;

-- 3) ZAiJob.idempotencyKey: scope theo người yêu cầu thay vì toàn cục.
--
-- Key do client gửi lên với pattern lỏng. Unique toàn cục cho phép một tenant chiếm
-- chỗ key của tenant khác (job hợp lệ bị từ chối IDEMPOTENCY_KEY_CONFLICT) và suy ra
-- key nào đã tồn tại. Ý nghĩa đúng của idempotency là "cùng một người gửi lại đúng
-- một yêu cầu", nên khoá theo [requestedById, idempotencyKey].
--
-- An toàn khi chạy: ràng buộc mới LỎNG HƠN ràng buộc cũ (mọi hàng đang thoả unique
-- toàn cục thì đương nhiên thoả unique theo cặp), nên không có dữ liệu nào vi phạm.
DROP INDEX IF EXISTS "ZAiJob_idempotencyKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ZAiJob_requestedById_idempotencyKey_key" ON "ZAiJob"("requestedById", "idempotencyKey");
