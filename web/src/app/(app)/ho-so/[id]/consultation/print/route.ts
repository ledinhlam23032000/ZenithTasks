import { requireCap } from "@/lib/auth";
import { canAccessCase } from "@/lib/case-access";
import { prisma } from "@/lib/db";
import { consultationPrintDocument, renderConsultationHtml } from "@/lib/consultation-sheet";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:ho-so");
  const { id } = await context.params;
  const record = await prisma.caseRecord.findUnique({
    where: { id },
    include: {
      customer: { select: { fullName: true, code: true, phoneLast5: true, gender: true, dob: true, address: true } },
      consultant: { select: { fullName: true } },
      doctor: { select: { fullName: true } },
      consultation: true,
      services: { orderBy: { createdAt: "asc" }, select: { name: true, quantity: true, finalPrice: true } },
    },
  });
  if (!record || !record.consultation || !canAccessCase(user, record, "read")) return new Response("Không tìm thấy Hồ sơ dịch vụ thẩm mỹ", { status: 404 });
  const document = consultationPrintDocument(record);
  return new Response(renderConsultationHtml(document, true), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
