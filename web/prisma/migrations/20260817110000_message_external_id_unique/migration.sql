-- Chống trùng tin nhắn khi Zalo/Facebook gửi lại cùng 1 sự kiện webhook (race condition):
-- code cũ kiểm tra "đã có externalId chưa" rồi mới ghi (2 bước tách rời, không nguyên tử)
-- — 2 webhook đến gần như đồng thời có thể cùng vượt qua bước kiểm tra rồi cùng tạo, sinh
-- ra 2 dòng Message trùng nhau. Thêm ràng buộc UNIQUE để tầng CSDL tự chặn; code chỉ cần
-- bắt lỗi P2002 (xem lib/channels/conversations.ts, hàm recordInboundMessage).

-- Dọn dữ liệu trùng đã lỡ phát sinh trước khi thêm ràng buộc (giữ dòng tạo sớm nhất mỗi
-- externalId, xóa các dòng trùng còn lại) — nếu chưa từng có dòng nào trùng thì không xóa gì.
DELETE FROM "Message" m
WHERE m."externalId" IS NOT NULL
  AND m."id" NOT IN (
    SELECT DISTINCT ON ("externalId") "id"
    FROM "Message"
    WHERE "externalId" IS NOT NULL
    ORDER BY "externalId", "createdAt" ASC, "id" ASC
  );

DROP INDEX IF EXISTS "Message_externalId_idx";
ALTER TABLE "Message" ADD CONSTRAINT "Message_externalId_key" UNIQUE ("externalId");
