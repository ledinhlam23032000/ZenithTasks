import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentRequestDocument, renderPaymentRequestHtml } from "@/lib/payment-request";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireCap("mod:ke-toan");
  const { id } = await context.params;
  const item = await prisma.paymentRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { fullName: true, address: true } },
      approver: { select: { fullName: true } },
    },
  });
  if (!item) return new Response("Không tìm thấy chứng từ", { status: 404 });

  return new Response(renderPaymentRequestHtml(paymentRequestDocument(item), true, request.headers.get("x-nonce")), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="giay-de-nghi-${item.requestNo}.html"`,
    },
  });
}
