import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyMediaToken } from "@/lib/media-token";

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

  // Kiểm tra quyền xem: đăng nhập HOẶC có vé ký hợp lệ cho đúng tệp này.
  const session = await getSession();
  if (!session) {
    const token = new URL(req.url).searchParams.get("t");
    if (!verifyMediaToken(file, token)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const ext = (file.split(".").pop() || "").toLowerCase();
  const full = path.join(process.cwd(), "public", "uploads", file);
  try {
    const buf = await fs.readFile(full);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
