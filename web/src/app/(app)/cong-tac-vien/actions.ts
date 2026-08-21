"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";

export type CtvState = { ok?: boolean; error?: string };

const ROLES = ["ADMIN", "MANAGER"] as const;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên cộng tác viên."),
  phone: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankHolder: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

const accountSchema = z.object({
  username: z.string().trim().min(3, "Tên đăng nhập tối thiểu 3 ký tự.").regex(/^[a-z0-9_.]+$/i, "Tên đăng nhập chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."),
  password: z.string().min(12, "Mật khẩu tối thiểu 12 ký tự."),
});

function parse(formData: FormData) {
  return profileSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    bankAccount: formData.get("bankAccount") ?? "",
    bankName: formData.get("bankName") ?? "",
    bankHolder: formData.get("bankHolder") ?? "",
    note: formData.get("note") ?? "",
  });
}

export async function createCollaborator(_prev: CtvState, formData: FormData): Promise<CtvState> {
  const admin = await requireUser([...ROLES]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const account = accountSchema.safeParse({
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!account.success) return { error: account.error.issues[0]?.message ?? "Vui lòng nhập tài khoản và mật khẩu CTV." };
  const uname = account.data.username.toLowerCase();
  const [dup, existingUser] = await Promise.all([
    prisma.collaborator.findUnique({ where: { name: d.name }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: { equals: uname, mode: "insensitive" } }, select: { id: true } }),
  ]);
  if (dup) return { error: "Tên cộng tác viên đã tồn tại." };
  if (existingUser) return { error: "Tên đăng nhập đã tồn tại." };

  await prisma.$transaction(async (tx) => {
    const accountUser = await tx.user.create({
      data: {
        fullName: d.name,
        username: uname,
        passwordHash: await hashPassword(account.data.password),
        role: "COLLABORATOR",
        mustChangePassword: false,
        active: true,
      },
    });
    await tx.collaborator.create({
      data: { userId: accountUser.id, name: d.name, phone: d.phone || null, bankAccount: d.bankAccount || null, bankName: d.bankName || null, bankHolder: d.bankHolder || null, note: d.note || null },
    });
    await auditRequired(tx, admin.id, "CREATE_COLLABORATOR_ACCOUNT", { entity: "Collaborator", meta: { username: uname } });
  });
  revalidatePath("/cong-tac-vien", "layout");
  return { ok: true };
}

export async function updateCollaborator(_prev: CtvState, formData: FormData): Promise<CtvState> {
  const user = await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu cộng tác viên." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const dup = await prisma.collaborator.findFirst({ where: { name: d.name, NOT: { id } }, select: { id: true } });
  if (dup) return { error: "Tên cộng tác viên đã tồn tại." };

  const current = await prisma.collaborator.findUnique({ where: { id }, select: { name: true, userId: true } });
  if (!current) return { error: "Không tìm thấy cộng tác viên." };

  // Đổi tên CTV: phải cập nhật luôn "Chi tiết nguồn" của các khách đã gắn CTV này
  // (hiệu suất CTV được gộp theo TÊN) — làm trong 1 giao dịch để không lệch dữ liệu.
  await prisma.$transaction(async (tx) => {
    let customersUpdated = 0;
    let leadsUpdated = 0;
    let appointmentsUpdated = 0;
    let payoutsUpdated = 0;
    let requestsUpdated = 0;
    if (current.name !== d.name) {
      const sourceWhere = { source: "COLLABORATOR" as const, sourceDetail: current.name };
      const [customers, leads, appointments, payouts, requests] = await Promise.all([
        tx.customer.updateMany({ where: { OR: [{ collaboratorId: id }, sourceWhere] }, data: { collaboratorId: id, sourceDetail: d.name } }),
        tx.lead.updateMany({ where: { OR: [{ collaboratorId: id }, sourceWhere] }, data: { collaboratorId: id, sourceDetail: d.name } }),
        tx.appointment.updateMany({ where: { OR: [{ collaboratorId: id }, sourceWhere] }, data: { collaboratorId: id, sourceDetail: d.name } }),
        tx.commissionPayout.updateMany({ where: { OR: [{ collaboratorId: id }, { name: current.name }] }, data: { collaboratorId: id, name: d.name } }),
        tx.paymentRequest.updateMany({ where: { OR: [{ payeeCollaboratorId: id }, { payeeName: current.name, type: "COLLABORATOR" }] }, data: { payeeCollaboratorId: id, payeeName: d.name } }),
      ]);
      customersUpdated = customers.count;
      leadsUpdated = leads.count;
      appointmentsUpdated = appointments.count;
      payoutsUpdated = payouts.count;
      requestsUpdated = requests.count;
      await tx.caseRecord.updateMany({ where: { OR: [{ collaboratorId: id }, { customer: { collaboratorId: id } }] }, data: { collaboratorId: id } });
    }
    await tx.collaborator.update({
      where: { id },
      data: { name: d.name, phone: d.phone || null, bankAccount: d.bankAccount || null, bankName: d.bankName || null, bankHolder: d.bankHolder || null, note: d.note || null },
    });
    if (current.name !== d.name) {
      await auditRequired(tx, user.id, "RENAME_COLLABORATOR", {
        entity: "Collaborator",
        entityId: id,
        meta: { from: current.name, to: d.name, customersUpdated, leadsUpdated, appointmentsUpdated, payoutsUpdated, requestsUpdated },
      });
    }
  });
  revalidatePath("/cong-tac-vien", "layout");
  return { ok: true };
}

export async function deleteCollaborator(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.collaborator.delete({ where: { id } }).catch(() => {});
  revalidatePath("/cong-tac-vien", "layout");
}
