"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type CtvState = { ok?: boolean; error?: string };

const ROLES = ["ADMIN", "MANAGER"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên cộng tác viên."),
  phone: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankHolder: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    bankAccount: formData.get("bankAccount") ?? "",
    bankName: formData.get("bankName") ?? "",
    bankHolder: formData.get("bankHolder") ?? "",
    note: formData.get("note") ?? "",
  });
}

export async function createCollaborator(_prev: CtvState, formData: FormData): Promise<CtvState> {
  await requireUser([...ROLES]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const dup = await prisma.collaborator.findUnique({ where: { name: d.name }, select: { id: true } });
  if (dup) return { error: "Tên cộng tác viên đã tồn tại." };
  await prisma.collaborator.create({
    data: { name: d.name, phone: d.phone || null, bankAccount: d.bankAccount || null, bankName: d.bankName || null, bankHolder: d.bankHolder || null, note: d.note || null },
  });
  return { ok: true };
}

export async function updateCollaborator(_prev: CtvState, formData: FormData): Promise<CtvState> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu cộng tác viên." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const dup = await prisma.collaborator.findFirst({ where: { name: d.name, NOT: { id } }, select: { id: true } });
  if (dup) return { error: "Tên cộng tác viên đã tồn tại." };

  const current = await prisma.collaborator.findUnique({ where: { id }, select: { name: true } });
  if (!current) return { error: "Không tìm thấy cộng tác viên." };

  // Đổi tên CTV: phải cập nhật luôn "Chi tiết nguồn" của các khách đã gắn CTV này
  // (hiệu suất CTV được gộp theo TÊN) — làm trong 1 giao dịch để không lệch dữ liệu.
  await prisma.$transaction(async (tx) => {
    if (current.name !== d.name) {
      await tx.customer.updateMany({
        where: { source: "COLLABORATOR", sourceDetail: current.name },
        data: { sourceDetail: d.name },
      });
    }
    await tx.collaborator.update({
      where: { id },
      data: { name: d.name, phone: d.phone || null, bankAccount: d.bankAccount || null, bankName: d.bankName || null, bankHolder: d.bankHolder || null, note: d.note || null },
    });
  });
  return { ok: true };
}

export async function deleteCollaborator(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.collaborator.delete({ where: { id } }).catch(() => {});
  revalidatePath("/cong-tac-vien", "layout");
}
