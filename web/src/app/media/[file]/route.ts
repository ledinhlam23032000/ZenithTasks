import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { authorizeMediaAccess } from "@/lib/media-access";

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
  const ext = (file.split(".").pop() || "").toLowerCase();
  const full = path.join(process.cwd(), "public", "uploads", file);
  const currentUser = await getCurrentUser();
  const searchParams = new URL(req.url).searchParams;
  const portalToken = searchParams.get("token");
  const mode = searchParams.get("download") === "1" ? "DOWNLOAD" : "VIEW";
  try {
    await authorizeMediaAccess(currentUser, file, mode, portalToken);
    const buf = await fs.readFile(full);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        ...(mode === "DOWNLOAD" ? { "Content-Disposition": `attachment; filename="${file}"` } : {}),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
