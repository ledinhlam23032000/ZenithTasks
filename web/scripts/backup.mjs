#!/usr/bin/env node
// ============================================================================
// SAO LƯU TỰ ĐỘNG (A5) — pg_dump (định dạng custom, nén) + ảnh (tar.gz).
// Ghi tệp trạng thái để trang /he-thong hiện "lần sao lưu gần nhất".
// Giữ N bản gần nhất (mặc định 14). Chạy: `node scripts/backup.mjs`.
//
// Đây là sao lưu TẠI CHỖ (trên máy chủ) + theo dõi trạng thái. Sao lưu RA NGOÀI
// (Google Drive / USB) vẫn dùng windows/Sao-Luu.ps1 — đó mới là phục hồi thảm hoạ.
// ============================================================================

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

const RUNTIME_DIR = process.env.ZENITH_RUNTIME_DIR || "/app/.runtime";
const BACKUP_DIR = path.join(RUNTIME_DIR, "backups");
const STATUS_FILE = path.join(RUNTIME_DIR, "backup-status.json");
const UPLOADS_DIR = process.env.ZENITH_UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
const RETAIN = Number(process.env.ZENITH_BACKUP_RETAIN || 14);

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeStatus(obj) {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
  await fs.writeFile(STATUS_FILE, JSON.stringify({ at: new Date().toISOString(), ...obj }, null, 2));
}

/** Xoá bớt các bản cũ, chỉ giữ RETAIN bản mới nhất theo tiền tố. */
async function prune(prefix) {
  const files = (await fs.readdir(BACKUP_DIR))
    .filter((f) => f.startsWith(prefix))
    .sort()
    .reverse();
  for (const f of files.slice(RETAIN)) {
    await fs.rm(path.join(BACKUP_DIR, f)).catch(() => {});
  }
}

async function main() {
  const dbUrl = (process.env.DATABASE_URL || "").split("?")[0]; // bỏ ?schema=public (pg_dump không hiểu)
  if (!dbUrl) throw new Error("Thiếu DATABASE_URL");

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = ts();
  const files = {};
  let sizeBytes = 0;

  // 1) Sao lưu CSDL (định dạng custom -Fc → nén sẵn, phục hồi bằng pg_restore).
  const dbFile = path.join(BACKUP_DIR, `db-${stamp}.dump`);
  await exec("pg_dump", ["-Fc", "--no-owner", "--no-privileges", "-f", dbFile, dbUrl], { maxBuffer: 64 * 1024 * 1024 });
  files.db = path.basename(dbFile);
  sizeBytes += (await fs.stat(dbFile)).size;
  await prune("db-");

  // 2) Sao lưu ảnh (nếu có).
  try {
    const names = (await fs.readdir(UPLOADS_DIR)).filter((n) => !n.startsWith("."));
    if (names.length > 0) {
      const upFile = path.join(BACKUP_DIR, `uploads-${stamp}.tar.gz`);
      await exec("tar", ["-czf", upFile, "-C", UPLOADS_DIR, "."], { maxBuffer: 64 * 1024 * 1024 });
      files.uploads = path.basename(upFile);
      sizeBytes += (await fs.stat(upFile)).size;
      await prune("uploads-");
    }
  } catch {
    /* không có thư mục ảnh → bỏ qua */
  }

  await writeStatus({ files, sizeBytes });
  console.log(`✓ Sao lưu xong: ${files.db}${files.uploads ? " + " + files.uploads : ""} (${sizeBytes} bytes)`);
}

main().catch(async (e) => {
  const msg = e?.message || String(e);
  await writeStatus({ error: msg }).catch(() => {});
  console.error("❌ Sao lưu lỗi:", msg);
  process.exit(1);
});
