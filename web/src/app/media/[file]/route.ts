import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Phục vụ ảnh đã tải lên qua ROUTE (đáng tin cậy ở production hơn là để trong public/).
// Đọc tệp từ thư mục uploads và trả về kèm đúng Content-Type.
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Chỉ cho phép tên tệp đơn giản (chống path traversal).
  if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = (file.split(".").pop() || "").toLowerCase();
  const full = path.join(process.cwd(), "public", "uploads", file);
  const currentUser = await getCurrentUser();
  const portalToken = new URL(req.url).searchParams.get("token");
  const photo = await prisma.photo.findFirst({
    where: { url: { endsWith: file } },
    select: { customer: { select: { portalToken: true } } },
  });
  const allowed = currentUser || (portalToken && photo?.customer.portalToken === portalToken);
  if (!allowed) return new NextResponse("Not found", { status: 404 });
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
