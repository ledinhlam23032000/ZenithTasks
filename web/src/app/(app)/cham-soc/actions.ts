"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type CareFormState = { ok?: boolean; error?: string; nonce?: number };

const schema = z.object({
  customerId: z.string().min(1),
  channel: z.enum(["NOTE", "ZALO", "SMS", "CALL", "EMAIL", "OTHER"]),
  direction: z.enum(["OUT", "IN"]).default("OUT"),
  content: z.string().trim().min(1, "Vui lòng nhập nội dung."),
  caseId: z.string().trim().optional(),
});

export async function addCareMessage(_prev: CareFormState, formData: FormData): Promise<CareFormState> {
  const user = await requireUser(["ADMIN", "MANAGER", "CARE"]);

  const parsed = schema.safeParse({
    customerId: formData.get("customerId") ?? "",
    channel: formData.get("channel") ?? "ZALO",
    direction: formData.get("direction") ?? "OUT",
    content: formData.get("content") ?? "",
    caseId: formData.get("caseId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  await prisma.careMessage.create({
    data: {
      customerId: data.customerId,
      channel: data.channel,
      direction: data.direction,
      content: data.content,
      caseId: data.caseId || null,
      createdById: user.id,
    },
  });

  revalidatePath("/cham-soc");
  revalidatePath(`/khach-hang/${data.customerId}`);
  revalidatePath("/dashboard");
  return { ok: true, nonce: Date.now() };
}

const editSchema = z.object({
  id: z.string().min(1),
  channel: z.enum(["NOTE", "ZALO", "SMS", "CALL", "EMAIL", "OTHER"]),
  direction: z.enum(["OUT", "IN"]).default("OUT"),
  content: z.string().trim().min(1, "Vui lòng nhập nội dung."),
});

export async function updateCareMessage(_prev: CareFormState, formData: FormData): Promise<CareFormState> {
  await requireUser(["ADMIN", "MANAGER", "CARE"]);

  const parsed = editSchema.safeParse({
    id: formData.get("id") ?? "",
    channel: formData.get("channel") ?? "ZALO",
    direction: formData.get("direction") ?? "OUT",
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const { id, channel, direction, content } = parsed.data;

  const m = await prisma.careMessage.update({
    where: { id },
    data: { channel, direction, content },
    select: { customerId: true },
  });

  if (m.customerId) revalidatePath(`/khach-hang/${m.customerId}`);
  revalidatePath("/cham-soc");
  return { ok: true, nonce: Date.now() };
}

export async function deleteCareMessage(formData: FormData): Promise<void> {
  await requireUser(["ADMIN", "MANAGER", "CARE"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const m = await prisma.careMessage.findUnique({ where: { id }, select: { customerId: true } });
  await prisma.careMessage.delete({ where: { id } }).catch(() => {});
  if (m?.customerId) revalidatePath(`/khach-hang/${m.customerId}`);
  revalidatePath("/cham-soc");
}
