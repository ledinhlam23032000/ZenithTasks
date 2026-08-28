-- Bổ sung các giá trị enum mà schema.prisma đã khai nhưng CHƯA có migration.
--
-- Vì sao cần: commit 75d95f3 thêm ZAiJobStatus.PENDING_APPROVAL (approval gate
-- của AI job engine), ZProjectStatus.SUSPENDED (lifecycle state machine) và
-- ZWorkspaceConfigKind.ROLES vào schema.prisma nhưng không kèm migration.
-- Prisma báo "No pending migrations" (không có file nào để chạy) trong khi
-- Postgres vẫn thiếu 3 label -> mọi lệnh ghi các giá trị này sẽ lỗi enum lúc
-- chạy thật, dù tsc và unit test đều xanh vì chúng chỉ thấy schema.
--
-- Additive, idempotent, không đụng dữ liệu sẵn có.
ALTER TYPE "ZAiJobStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "ZProjectStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "ZWorkspaceConfigKind" ADD VALUE IF NOT EXISTS 'ROLES';
