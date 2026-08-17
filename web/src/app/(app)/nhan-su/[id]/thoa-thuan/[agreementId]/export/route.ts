import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { agreementTitle } from "@/lib/agreement-templates";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export async function GET(_request: Request, context: { params: Promise<{ id: string; agreementId: string }> }) {
  await requireCap("mod:nhan-su");
  const { id, agreementId } = await context.params;
  const item = await prisma.staffAgreement.findFirst({ where: { id: agreementId, userId: id }, include: { user: { select: { fullName: true } } } });
  if (!item) return new Response("Không tìm thấy thỏa thuận", { status: 404 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(item.title)}</title><style>body{font-family:'Times New Roman',serif;color:#111;max-width:850px;margin:32px auto;line-height:1.55}h1{text-align:center;font-size:20px}h2{text-align:center;font-size:15px;font-weight:normal}.meta{border:1px solid #999;padding:10px;margin:18px 0;font-size:13px}.content{white-space:pre-wrap;font-size:14px}.sign{display:grid;grid-template-columns:1fr 1fr;margin-top:42px;text-align:center;gap:40px}.print{position:fixed;right:20px;top:20px}@media print{.print{display:none}body{margin:0}}</style></head><body><button class="print" onclick="window.print()">In / Lưu PDF</button><h1>${esc(item.title)}</h1><h2>${esc(item.user.fullName)} — phiên bản ${item.version}</h2><div class="meta">Trạng thái: ${esc(item.status)}<br>Ngày ký: ${item.signedAt ? item.signedAt.toLocaleDateString("vi-VN") : "Chưa ký"}<br>Hiệu lực: ${item.effectiveFrom ? item.effectiveFrom.toLocaleDateString("vi-VN") : "—"}${item.effectiveUntil ? ` đến ${item.effectiveUntil.toLocaleDateString("vi-VN")}` : ""}</div><div class="content">${esc(item.contentSnapshot)}</div><div class="sign"><div>ĐẠI DIỆN BÊN A<br><br><br>(Ký, ghi rõ họ tên, đóng dấu)</div><div>BÊN B<br><br><br>(Ký, ghi rõ họ tên)</div></div></body></html>`;
  return new Response("﻿" + html, { headers: { "Content-Type": "application/msword; charset=utf-8", "Content-Disposition": `attachment; filename="thoa-thuan-${item.user.fullName}-v${item.version}.doc"` } });
}
