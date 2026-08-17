import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyMediaToken } from "@/lib/media-token";
import { getUploadDir } from "@/lib/upload-storage";
import { prisma } from "@/lib/db";
import { canAccessCase } from "@/lib/case-access";
import { userCan } from "@/lib/permissions";

// Phục vụ ảnh đã tải lên qua ROUTE (đáng tin cậy ở production hơn là để trong public/).
// Đọc tệp từ thư mục uploads và trả về kèm đúng Content-Type.
//
// BẢO MẬT (ảnh y khoa): KHÔNG còn công khai. Chỉ phục vụ khi:
//   • có phiên đăng nhập hợp lệ (nhân viên), HOẶC
//   • có "vé" ký ngắn hạn ?t=... đúng tệp (cổng khách /khach/[token]).
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  // Giấy tờ hành chính (CaseDocument): PDF mở xem ngay trên trình duyệt; Word/Excel tải về.
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Chỉ cho phép tên tệp đơn giản (chống path traversal).
  if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = (file.split(".").pop() || "").toLowerCase();
  const full = path.join(getUploadDir(), file);
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    const token = new URL(req.url).searchParams.get("t");
    if (!verifyMediaToken(file, token)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const portalPhoto = await prisma.photo.findFirst({
      where: { url: { in: [`/media/${file}`, `/uploads/${file}`] } },
      select: { type: true },
    });
    if (portalPhoto?.type === "CLINICAL") return new NextResponse("Forbidden", { status: 403 });
  } else {
    const mediaUrls = [`/media/${file}`, `/uploads/${file}`];
    const [photo, document, avatar] = await Promise.all([
      prisma.photo.findFirst({ where: { url: { in: mediaUrls } }, select: { case: { select: { consultantId: true, doctorId: true } } } }),
      prisma.caseDocument.findFirst({ where: { url: { in: mediaUrls } }, select: { case: { select: { consultantId: true, doctorId: true } } } }),
      prisma.user.findFirst({ where: { avatarUrl: { in: mediaUrls } }, select: { id: true } }),
    ]);
    const ownerCase = photo?.case ?? document?.case;
    // Clinical images/documents require the clinical capability, not merely
    // generic case visibility (reception/shareholder must not see them).
    if (ownerCase && !canAccessCase(currentUser, ownerCase, "clinical")) return new NextResponse("Forbidden", { status: 403 });
    if (!ownerCase && (photo || document) && !userCan(currentUser, "case.clinical")) return new NextResponse("Forbidden", { status: 403 });
    if (!ownerCase && !avatar && !photo && !document) return new NextResponse("Not found", { status: 404 });
  }
  try {
    const buf = await fs.readFile(full);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
