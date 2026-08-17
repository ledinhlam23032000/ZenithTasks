import { startOfDay, endOfDay, format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  CREATE_CUSTOMER: "Tạo khách",
  UPDATE_CUSTOMER: "Sửa khách",
  DELETE_CUSTOMER: "Xóa khách",
  DELETE_PAYMENT: "Xóa khoản thu",
  UPDATE_PAYMENT: "Sửa khoản thu",
  DELETE_CASE: "Xóa hồ sơ",
  APPLY_VOUCHER: "Áp voucher",
  DELETE_CARE: "Xóa tin chăm sóc",
  REVEAL_PHONE: "Xem SĐT đầy đủ",
  ENABLE_2FA: "Bật 2 lớp",
  DISABLE_2FA: "Tắt 2 lớp",
};

function metaText(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const o = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (o.amount != null) parts.push(`Số tiền: ${Number(o.amount).toLocaleString("vi-VN")} đ`);
  if (o.code) parts.push(`Mã: ${String(o.code)}`);
  return parts.join(" · ");
}

/** Xuất nhật ký hệ thống (đúng bộ lọc đang xem, TOÀN BỘ bản ghi khớp): ?format=xlsx (mặc định) | doc | csv. */
export async function GET(request: Request) {
  await requireCap("mod:nhat-ky");
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const action = (url.searchParams.get("action") ?? "").trim();
  const actorId = (url.searchParams.get("actorId") ?? "").trim();
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();

  const where: Prisma.AuditLogWhereInput = {};
  if (action && action in ACTION_LABEL) where.action = action;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    where.at = {
      ...(from && !Number.isNaN(new Date(from).getTime()) ? { gte: startOfDay(new Date(from)) } : {}),
      ...(to && !Number.isNaN(new Date(to).getTime()) ? { lte: endOfDay(new Date(to)) } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { at: "desc" },
    include: { actor: { select: { fullName: true } } },
  });

  const fileBase = `nhat-ky-${format(new Date(), "yyyy-MM-dd")}`;
  const columns = ["Thời gian", "Người thực hiện", "Hành động", "Đối tượng", "Chi tiết", "IP"];
  const rows: Cell[][] = logs.map((l) => [
    fmtDateTime(l.at),
    l.actor?.fullName ?? "",
    ACTION_LABEL[l.action] ?? l.action,
    l.entity ?? "",
    metaText(l.meta),
    l.ip ?? "",
  ]);

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: "Nhật ký hệ thống",
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [{ heading: `${logs.length} bản ghi`, columns, rows }],
    });
  }
  if (fmt === "csv") {
    return csvResponse(fileBase, [columns, ...rows]);
  }
  return xlsxResponse(fileBase, [
    { name: "Nhật ký", columns: columns.map((header, i) => ({ header, width: i === 4 ? 30 : i === 1 ? 20 : 16 })), rows },
  ]);
}
