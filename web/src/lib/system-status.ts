import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "./db";
import { getUploadDir } from "./upload-storage";
import { securityWarnings } from "./security-status";

// ============================================================================
// TÌNH TRẠNG HỆ THỐNG (A7) — số liệu cho trang /he-thong (ADMIN).
// Gom: cảnh báo bảo mật, quy mô dữ liệu, dung lượng ảnh, kích thước DB, lần
// sao lưu gần nhất (đọc từ tệp do scripts/backup.mjs ghi).
// ============================================================================

export type BackupInfo = {
  lastBackupAt: string | null;
  ageHours: number | null;
  ok: boolean; // có backup trong 48h gần đây
  files?: { db?: string; uploads?: string };
  sizeBytes?: number;
  error?: string;
};

const RUNTIME_DIR = process.env.ZENITH_RUNTIME_DIR || "/app/.runtime";
const BACKUP_STATUS_FILE = path.join(RUNTIME_DIR, "backup-status.json");

async function readBackupInfo(): Promise<BackupInfo> {
  try {
    const raw = await fs.readFile(BACKUP_STATUS_FILE, "utf8");
    const j = JSON.parse(raw) as { at?: string; files?: { db?: string; uploads?: string }; sizeBytes?: number; error?: string };
    if (j.error) return { lastBackupAt: j.at ?? null, ageHours: null, ok: false, error: j.error };
    const at = j.at ? new Date(j.at) : null;
    const ageHours = at ? (Date.now() - at.getTime()) / 3_600_000 : null;
    return {
      lastBackupAt: j.at ?? null,
      ageHours,
      ok: ageHours !== null && ageHours <= 48,
      files: j.files,
      sizeBytes: j.sizeBytes,
    };
  } catch {
    // Chưa có lần backup nào (hoặc chưa bật lịch backup).
    return { lastBackupAt: null, ageHours: null, ok: false };
  }
}

async function uploadsUsage(): Promise<{ count: number; bytes: number }> {
  const dir = getUploadDir();
  try {
    const names = await fs.readdir(dir);
    let bytes = 0;
    let count = 0;
    for (const n of names) {
      if (n.startsWith(".")) continue;
      try {
        const st = await fs.stat(path.join(dir, n));
        if (st.isFile()) {
          bytes += st.size;
          count += 1;
        }
      } catch {
        /* bỏ qua tệp lỗi */
      }
    }
    return { count, bytes };
  } catch {
    return { count: 0, bytes: 0 };
  }
}

export async function getSystemStatus() {
  const [
    customers,
    cases,
    payments,
    photos,
    users,
    openDebt,
    dbSize,
    uploads,
    backup,
    recentAudit,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.caseRecord.count(),
    prisma.payment.count(),
    prisma.photo.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.caseRecord.aggregate({ where: { debtAmount: { gt: 0 } }, _sum: { debtAmount: true }, _count: true }),
    prisma.$queryRaw<Array<{ size: bigint }>>`SELECT pg_database_size(current_database()) AS size`,
    uploadsUsage(),
    readBackupInfo(),
    prisma.auditLog.findMany({
      orderBy: { at: "desc" },
      take: 10,
      include: { actor: { select: { fullName: true } } },
    }),
  ]);

  return {
    warnings: securityWarnings(),
    data: {
      customers,
      cases,
      payments,
      photos,
      activeUsers: users,
      openDebtCount: openDebt._count,
    },
    storage: {
      dbBytes: Number(dbSize[0]?.size ?? 0),
      uploadsBytes: uploads.bytes,
      uploadsCount: uploads.count,
    },
    backup,
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor?.fullName ?? "Hệ thống",
      at: a.at,
      entity: a.entity,
    })),
  };
}

/** Đổi số byte sang chuỗi dễ đọc (KB/MB/GB). */
export function humanBytes(n: number): string {
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
