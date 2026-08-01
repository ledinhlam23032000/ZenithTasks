import { getCurrentUser } from "@/lib/auth";
import { canReadInboxAttachment, diskAttachmentStore } from "@/lib/channels/attachments";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const attachment = await prisma.inboxAttachment.findUnique({
    where: { id },
    include: { message: { select: { conversation: { select: { assigneeId: true } } } } },
  });
  if (!attachment || attachment.status !== "READY" || !attachment.storagePath || !attachment.mimeType) return Response.json({ error: "not_found" }, { status: 404 });
  if (!canReadInboxAttachment(user, attachment.message.conversation)) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const body = await diskAttachmentStore.read!(attachment.storagePath);
    const safeName = (attachment.originalName ?? `tep-${attachment.id}`).replace(/[\r\n"\\/]/g, "_").slice(0, 180);
    const responseBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    return new Response(responseBody, {
      headers: {
        "content-type": attachment.mimeType,
        "content-length": String(body.byteLength),
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
}
