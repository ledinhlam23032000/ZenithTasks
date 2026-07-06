import { prisma } from "@/lib/db";

// ============================================================================
// CẤU HÌNH KHOÁ–GIÁ TRỊ (AppSetting) — dùng chung toàn hệ thống, lưu ở DB nên
// mọi máy con thấy như nhau và KHÔNG mất khi tải lại/điều hướng.
// ============================================================================

export const DEBT_THRESHOLD_KEY = "debt.threshold";
export const DEBT_THRESHOLD_DEFAULT = 5_000_000; // ngưỡng cảnh báo công nợ mặc định (VND)

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Ngưỡng cảnh báo công nợ đang lưu (rơi về mặc định nếu chưa đặt / giá trị hỏng). */
export async function getDebtThreshold(): Promise<number> {
  const raw = await getSetting(DEBT_THRESHOLD_KEY);
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEBT_THRESHOLD_DEFAULT;
}
