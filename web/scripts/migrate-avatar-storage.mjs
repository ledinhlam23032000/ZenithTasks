#!/usr/bin/env node
// ============================================================================
// DI CHUYỂN LƯU TRỮ ẢNH ĐẠI DIỆN — chạy tự động lúc container khởi động, AN TOÀN
// chạy lại nhiều lần (idempotent: không còn gì để chuyển thì thoát êm).
//
// TRƯỚC: ảnh đại diện lưu ở public/uploads/avatars/<f> — đây là đường dẫn tĩnh
// Next.js phục vụ CÔNG KHAI (không qua đăng nhập), vì route /media/[file] (có xác
// thực) chỉ đọc PHẲNG public/uploads/<f>, không hỗ trợ thư mục con.
// SỬA: chuyển vật lý các tệp còn lại ra thư mục phẳng public/uploads/ (giống ảnh hồ
// sơ/giấy tờ) + cập nhật User.avatarUrl từ "/uploads/avatars/<f>" → "/uploads/<f>"
// (photoSrc() ở phía hiển thị tự đổi tiếp thành "/media/<f>").
// ============================================================================
import { promises as fs } from "node:fs";
import path from "node:path";
import pg from "pg";

const UPLOADS_DIR = process.env.ZENITH_UPLOADS_DIR || process.env.UPLOAD_DIR || path.join(process.cwd(), "private", "uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");

async function main() {
  let files;
  try {
    files = await fs.readdir(AVATARS_DIR);
  } catch {
    return; // Không có thư mục cũ (cài mới / đã chuyển xong trước đó) — không có gì để làm.
  }
  if (files.length === 0) {
    await fs.rmdir(AVATARS_DIR).catch(() => {});
    return;
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let moved = 0;
  for (const f of files) {
    try {
      await fs.rename(path.join(AVATARS_DIR, f), path.join(UPLOADS_DIR, f));
    } catch (e) {
      console.error(`  ✗ Không chuyển được ảnh đại diện ${f}:`, e.message);
      continue;
    }
    await client.query('UPDATE "User" SET "avatarUrl" = $1 WHERE "avatarUrl" IN ($2, $3)', [`/media/${f}`, `/uploads/avatars/${f}`, `/uploads/${f}`]);
    moved++;
  }
  await client.end();
  await fs.rmdir(AVATARS_DIR).catch(() => {});
  if (moved > 0) console.log(`🖼️  Đã chuyển ${moved} ảnh đại diện sang lưu trữ mới (qua /media, có xác thực).`);
}

main().catch((e) => {
  // Không chặn khởi động app vì lỗi ở bước dọn dẹp không nghiêm trọng — ảnh cũ (nếu có)
  // chỉ tạm thời không hiện, không mất dữ liệu (tệp gốc + bản ghi DB vẫn còn nguyên).
  console.error("⚠️  Lỗi di chuyển ảnh đại diện (bỏ qua, không chặn khởi động):", e.message);
});
