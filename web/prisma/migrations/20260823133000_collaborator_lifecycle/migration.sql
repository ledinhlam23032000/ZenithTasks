-- Trạng thái vòng đời CTV: đình chỉ/lưu trữ mềm, không xóa hồ sơ hoặc dữ liệu tham chiếu.
ALTER TABLE "Collaborator"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "statusNote" TEXT;
