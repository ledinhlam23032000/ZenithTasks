#!/usr/bin/env node
// ============================================================================
// KHÔI PHỤC KHẨN CẤP (MC-14) — restore CSDL từ file pg_dump (-Fc) đã sao lưu
// trước một lần migrate/deploy, dùng khi bản deploy mới gây lỗi cần lùi lại.
//
// AN TOÀN — script này chỉ THAM KHẢO & CHUẨN BỊ theo mặc định (dry-run).
// Phải truyền thêm --yes thì mới thực sự ghi đè CSDL. Đây là hành động PHÁ HUỶ
// (ghi đè toàn bộ dữ liệu hiện tại) — chỉ chạy khi đã xác nhận với chủ dự án.
//
// Cách dùng:
//   node scripts/rollback-restore.mjs <đường-dẫn-file.dump>            (xem trước, không đổi gì)
//   node scripts/rollback-restore.mjs <đường-dẫn-file.dump> --yes      (thực sự khôi phục)
//
// Quy trình khi --yes:
//   1) Kiểm tra file dump hợp lệ (magic bytes "PGDMP" của pg_dump -Fc).
//   2) Tự sao lưu CSDL HIỆN TẠI trước (an toàn-của-an-toàn — có thể lùi lại
//      chính thao tác rollback này nếu chọn nhầm file).
//   3) Dừng container app (tránh ghi dữ liệu trong lúc restore).
//   4) pg_restore --clean --if-exists vào container db qua `docker compose exec`.
//   5) Khởi động lại container app.
//   6) In số liệu Customer/CaseRecord/Payment trước & sau để đối chiếu bằng mắt.
//   7) Ghi log đầy đủ vào .runtime/rollback-logs/.
//
// Không cần biết mật khẩu DB: mọi lệnh chạy trong container qua `docker compose
// exec db`, dùng biến POSTGRES_USER/POSTGRES_PASSWORD container tự có sẵn.
// ============================================================================

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG_DIR = path.join(REPO_ROOT, ".runtime", "rollback-logs");

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const log = [];
function say(line) {
  console.log(line);
  log.push(`[${new Date().toISOString()}] ${line}`);
}

async function run(cmd, args, opts = {}) {
  say(`$ ${cmd} ${args.join(" ")}`);
  return exec(cmd, args, { cwd: REPO_ROOT, maxBuffer: 256 * 1024 * 1024, ...opts });
}

/** Chạy 1 lệnh sh bên trong container db, tái dùng POSTGRES_USER/PASSWORD sẵn có trong container. */
function dbExecArgs(shCommand, extra = []) {
  return ["compose", "exec", "-T", ...extra, "db", "sh", "-c", shCommand];
}

async function assertValidDump(dumpPath) {
  const fh = await fs.open(dumpPath, "r");
  try {
    const buf = Buffer.alloc(5);
    await fh.read(buf, 0, 5, 0);
    if (buf.toString("utf8") !== "PGDMP") {
      throw new Error(`File "${dumpPath}" không phải định dạng pg_dump custom (-Fc) hợp lệ (thiếu magic bytes PGDMP).`);
    }
  } finally {
    await fh.close();
  }
}

async function tableCounts(label) {
  const query = "SELECT 'Customer' t, count(*) c FROM \\\"Customer\\\" UNION ALL SELECT 'CaseRecord', count(*) FROM \\\"CaseRecord\\\" UNION ALL SELECT 'Payment', count(*) FROM \\\"Payment\\\";";
  const sh = `PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "${query}"`;
  try {
    const { stdout } = await run("docker", dbExecArgs(sh));
    say(`Số liệu ${label}:\n${stdout.trim()}`);
    return stdout.trim();
  } catch (e) {
    say(`⚠️  Không đọc được số liệu ${label}: ${e.message}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dumpArg = args.find((a) => !a.startsWith("--"));
  const confirmed = args.includes("--yes");
  if (!dumpArg) {
    console.error("Thiếu đường dẫn file dump.\nCách dùng: node scripts/rollback-restore.mjs <file.dump> [--yes]");
    process.exit(1);
  }
  const dumpPath = path.resolve(dumpArg);
  const stat = await fs.stat(dumpPath).catch(() => null);
  if (!stat) {
    console.error(`Không tìm thấy file: ${dumpPath}`);
    process.exit(1);
  }
  await assertValidDump(dumpPath);

  say(`Kế hoạch khôi phục CSDL từ: ${dumpPath} (${stat.size} bytes, sửa lần cuối ${stat.mtime.toISOString()})`);
  say(`Repo: ${REPO_ROOT}`);

  if (!confirmed) {
    say("⚠️  DRY-RUN — chưa đổi gì. Đây là thao tác GHI ĐÈ TOÀN BỘ dữ liệu hiện tại, không thể hoàn tác trừ khi có bản sao lưu.");
    say("Xem lại đúng file dump ở trên. Nếu chắc chắn, chạy lại với cờ --yes để: (1) tự sao lưu CSDL hiện tại, (2) dừng app, (3) restore, (4) khởi động lại app, (5) in số liệu đối chiếu.");
    return;
  }

  await fs.mkdir(LOG_DIR, { recursive: true });
  const stamp = ts();

  say("=== BƯỚC 1/5: Sao lưu CSDL HIỆN TẠI trước khi ghi đè (an toàn-của-an-toàn) ===");
  const safetyFile = path.join(LOG_DIR, `pre-rollback-safety-${stamp}.dump`);
  const safetySh = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -Fc --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"';
  const { stdout: dumpOut } = await run("docker", dbExecArgs(safetySh), { encoding: "buffer" });
  await fs.writeFile(safetyFile, dumpOut);
  say(`✓ Đã lưu bản an toàn trước rollback: ${safetyFile} (${dumpOut.length} bytes)`);

  await tableCounts("TRƯỚC khi khôi phục");

  say("=== BƯỚC 2/5: Dừng container app (tránh ghi dữ liệu trong lúc restore) ===");
  await run("docker", ["compose", "stop", "app"]);
  say("✓ Đã dừng app.");

  say("=== BƯỚC 3/5: pg_restore --clean --if-exists vào container db ===");
  const restoreSh = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"';
  await new Promise((resolve, reject) => {
    const child = execFile("docker", dbExecArgs(restoreSh), { cwd: REPO_ROOT, maxBuffer: 256 * 1024 * 1024 }, (err, stdout, stderr) => {
      // pg_restore thường thoát với cảnh báo "does not exist, skipping" (bình thường
      // với --if-exists trên CSDL rỗng/khác schema) — chỉ coi là lỗi nếu tiến trình
      // không tự thoát được (exit code khác 0 VÀ không có gợi ý "skipping").
      if (err && !/skipping|already exists/i.test(String(stderr))) return reject(new Error(stderr || err.message));
      if (stdout) say(stdout.trim());
      if (stderr) say(stderr.trim());
      resolve();
    });
    createReadStream(dumpPath).pipe(child.stdin);
  });
  say("✓ Đã restore xong.");

  say("=== BƯỚC 4/5: Khởi động lại container app ===");
  await run("docker", ["compose", "up", "-d", "--no-deps", "app"]);
  say("✓ Đã khởi động lại app.");

  say("=== BƯỚC 5/5: Đối chiếu số liệu sau khi khôi phục ===");
  await tableCounts("SAU khi khôi phục");

  const logFile = path.join(LOG_DIR, `rollback-${stamp}.log`);
  await fs.writeFile(logFile, log.join("\n") + "\n");
  say(`✓ Hoàn tất. Log đầy đủ: ${logFile}`);
  say("Anh hãy tự kiểm tra lại số liệu ở trên và đăng nhập thử ứng dụng trước khi báo là đã khôi phục xong.");
}

main().catch(async (e) => {
  const msg = e?.message || String(e);
  console.error("❌ Khôi phục lỗi:", msg);
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.writeFile(path.join(LOG_DIR, `rollback-error-${ts()}.log`), log.join("\n") + `\n[ERROR] ${msg}\n`);
  } catch {
    /* bỏ qua lỗi ghi log khi đã lỗi chính */
  }
  process.exit(1);
});
