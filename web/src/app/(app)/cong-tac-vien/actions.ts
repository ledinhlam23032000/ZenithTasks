"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";
import { requireUser, hashPassword } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { syncCollaboratorIdentity } from "@/lib/collaborator-sync";
import { isAllowedDocMime, docExt, safeStoredName, isDocumentBufferValid } from "@/lib/upload";
import { getUploadDir, getUploadStorageError } from "@/lib/upload-storage";

export type CtvState = { ok?: boolean; error?: string; nonce?: number };

const ROLES = ["ADMIN", "MANAGER"] as const;
const STAFF_ROLES = ["MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "NURSE", "CARE", "SHAREHOLDER"] as const;
const staffRoleSchema = z.enum(STAFF_ROLES);

type StaffRole = (typeof STAFF_ROLES)[number];

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

const payoutSchema = z.object({
  collaboratorId: z.string().trim().min(1, "Thiếu cộng tác viên."),
  amount: z.coerce.number().int().positive("Số tiền phải lớn hơn 0."),
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Kỳ hoa hồng phải có dạng YYYY-MM."),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự.").optional(),
  paymentRequestId: z.string().trim().optional(),
  paidAt: z.string().trim().optional(),
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
  const legacyName = String(formData.get("legacyName") ?? "").trim();
  const account = accountSchema.safeParse({
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!account.success) return { error: account.error.issues[0]?.message ?? "Vui lòng nhập tài khoản và mật khẩu CTV." };
  const uname = account.data.username.toLowerCase();
  const [dup, existingUser, legacyProfile] = await Promise.all([
    prisma.collaborator.findUnique({ where: { name: d.name }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: { equals: uname, mode: "insensitive" } }, select: { id: true } }),
    legacyName ? prisma.collaborator.findUnique({ where: { name: legacyName }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (dup) return { error: "Tên cộng tác viên đã tồn tại." };
  if (legacyName && legacyProfile) return { error: "Tên legacy này đã được đăng ký thành hồ sơ CTV khác. Hãy dùng chức năng đối soát ID." };
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
    const collaborator = await tx.collaborator.create({
      data: { userId: accountUser.id, name: d.name, phone: d.phone || null, bankAccount: d.bankAccount || null, bankName: d.bankName || null, bankHolder: d.bankHolder || null, note: d.note || null },
    });
    const counts = legacyName
      ? await syncCollaboratorIdentity(tx, { collaboratorId: collaborator.id, legacyName, displayName: d.name })
      : { customers: 0, leads: 0, appointments: 0, cases: 0, payouts: 0, paymentRequests: 0 };
    await auditRequired(tx, admin.id, "CREATE_COLLABORATOR_ACCOUNT", {
      entity: "Collaborator",
      entityId: collaborator.id,
      meta: { username: uname, legacyName: legacyName || null, linkedLegacy: Boolean(legacyName), ...counts, moneyRecalculated: false },
    });
  });
  revalidatePath("/cong-tac-vien", "layout");
  if (legacyName && legacyName !== d.name) redirect(`/cong-tac-vien/${encodeURIComponent(d.name)}`);
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

  await prisma.$transaction(async (tx) => {
    const counts = await syncCollaboratorIdentity(tx, { collaboratorId: id, legacyName: current.name, displayName: d.name });
    await tx.collaborator.update({
      where: { id },
      data: { name: d.name, phone: d.phone || null, bankAccount: d.bankAccount || null, bankName: d.bankName || null, bankHolder: d.bankHolder || null, note: d.note || null },
    });
    if (current.userId) {
      await tx.user.update({ where: { id: current.userId }, data: { fullName: d.name } });
    }
    await auditRequired(tx, user.id, current.name !== d.name ? "RENAME_COLLABORATOR" : "SYNC_COLLABORATOR_IDENTITY", {
      entity: "Collaborator",
      entityId: id,
      meta: { from: current.name, to: d.name, ...counts, moneyRecalculated: false },
    });
  });
  revalidatePath("/cong-tac-vien", "layout");
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(id)}`);
  return { ok: true };
}

export async function reconcileLegacyCollaborator(_prev: CtvState, formData: FormData): Promise<CtvState> {
  const admin = await requireUser(["ADMIN"]);
  const collaboratorId = String(formData.get("collaboratorId") ?? "");
  const legacyName = String(formData.get("legacyName") ?? "").trim();
  if (!collaboratorId || !legacyName) return { error: "Thiếu CTV hoặc tên legacy." };
  const collaborator = await prisma.collaborator.findUnique({ where: { id: collaboratorId }, select: { id: true, name: true } });
  if (!collaborator) return { error: "Không tìm thấy CTV đích." };
  await prisma.$transaction(async (tx) => {
    const counts = await syncCollaboratorIdentity(tx, { collaboratorId, legacyName, displayName: collaborator.name });
    await auditRequired(tx, admin.id, "RECONCILE_COLLABORATOR_ID", {
      entity: "Collaborator",
      entityId: collaboratorId,
      meta: { legacyName, ...counts, moneyRecalculated: false },
    });
  });
  revalidatePath("/cong-tac-vien", "layout");
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(collaboratorId)}`);
  return { ok: true };
}

export async function suspendCollaborator(formData: FormData): Promise<void> {
  const admin = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    const target = await tx.collaborator.findUnique({ where: { id }, select: { name: true, active: true, archivedAt: true, userId: true, user: { select: { role: true } } } });
    if (!target || target.archivedAt) return;
    await tx.collaborator.update({ where: { id }, data: { active: false, suspendedAt: new Date(), statusNote: reason } });
    if (target.userId && target.user?.role === "COLLABORATOR") {
      await tx.user.update({ where: { id: target.userId }, data: { active: false } });
    }
    await auditRequired(tx, admin.id, "SUSPEND_COLLABORATOR", { entity: "Collaborator", entityId: id, meta: { name: target.name, reason } });
  });
  revalidatePath("/cong-tac-vien", "layout");
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(id)}`);
}

export async function restoreCollaborator(formData: FormData): Promise<void> {
  const admin = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    const target = await tx.collaborator.findUnique({ where: { id }, select: { name: true, active: true, archivedAt: true, userId: true, user: { select: { role: true } } } });
    if (!target || target.active) return;
    await tx.collaborator.update({ where: { id }, data: { active: true, suspendedAt: null, archivedAt: null, statusNote: null } });
    if (target.userId && target.user?.role === "COLLABORATOR") {
      await tx.user.update({ where: { id: target.userId }, data: { active: true } });
    }
    await auditRequired(tx, admin.id, "RESTORE_COLLABORATOR", { entity: "Collaborator", entityId: id, meta: { name: target.name } });
  });
  revalidatePath("/cong-tac-vien", "layout");
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(id)}`);
}

export async function archiveCollaborator(formData: FormData): Promise<void> {
  const admin = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    const target = await tx.collaborator.findUnique({ where: { id }, select: { name: true, archivedAt: true, userId: true, user: { select: { role: true } } } });
    if (!target || target.archivedAt) return;
    await tx.collaborator.update({ where: { id }, data: { active: false, suspendedAt: null, archivedAt: new Date(), statusNote: reason } });
    if (target.userId && target.user?.role === "COLLABORATOR") {
      await tx.user.update({ where: { id: target.userId }, data: { active: false } });
    }
    await auditRequired(tx, admin.id, "ARCHIVE_COLLABORATOR", { entity: "Collaborator", entityId: id, meta: { name: target.name, reason, dataDeleted: false } });
  });
  revalidatePath("/cong-tac-vien", "layout");
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(id)}`);
}

/** Tương thích với form cũ: "xóa CTV" nay chỉ lưu trữ mềm, không xóa bản ghi. */
export async function deleteCollaborator(formData: FormData): Promise<void> {
  return archiveCollaborator(formData);
}

export async function convertCollaboratorToStaff(formData: FormData): Promise<void> {
  const admin = await requireUser(["ADMIN"]);
  const collaboratorId = String(formData.get("collaboratorId") ?? "").trim();
  const parsed = staffRoleSchema.safeParse(String(formData.get("role") ?? ""));
  if (!collaboratorId || !parsed.success) throw new Error("Vai trò nhân viên không hợp lệ.");
  const nextRole: StaffRole = parsed.data;
  await prisma.$transaction(async (tx) => {
    const target = await tx.collaborator.findUnique({ where: { id: collaboratorId }, select: { id: true, name: true, active: true, archivedAt: true, userId: true, user: { select: { id: true, role: true, position: true, department: true } } } });
    if (!target) throw new Error("Không tìm thấy cộng tác viên.");
    if (!target.active || target.archivedAt) throw new Error("Hãy khôi phục CTV trước khi chuyển thành nhân viên.");
    if (!target.userId || !target.user) throw new Error("CTV này chưa có tài khoản đăng nhập để chuyển đổi.");
    if (target.user.role === nextRole) return;
    await tx.user.update({ where: { id: target.userId }, data: { role: nextRole as Role, active: true, employmentStatus: "ACTIVE", retiredAt: null, retiredById: null } });
    await tx.staffRoleHistory.create({ data: { userId: target.userId, fromRole: target.user.role, toRole: nextRole as Role, fromPosition: target.user.position, toPosition: target.user.position, fromDepartment: target.user.department, toDepartment: target.user.department, note: "Chuyển từ CTV sang nhân viên theo quyết định quản trị viên", changedById: admin.id } });
    await auditRequired(tx, admin.id, "CONVERT_COLLABORATOR_TO_STAFF", { entity: "User", entityId: target.userId, meta: { collaboratorId, name: target.name, fromRole: target.user.role, toRole: nextRole, collaboratorProfileKept: true, dataDeleted: false } });
  });
  revalidatePath("/cong-tac-vien", "layout");
  revalidatePath("/nhan-su", "layout");
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(collaboratorId)}`);
}

export async function uploadCollaboratorDocument(_prev: CtvState, formData: FormData): Promise<CtvState> {
  const user = await requireUser([...ROLES]);
  const collaboratorId = String(formData.get("collaboratorId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!collaboratorId) return { error: "Thiếu cộng tác viên." };
  if (!title) return { error: "Vui lòng nhập tên tài liệu." };
  if (title.length > 200) return { error: "Tên tài liệu tối đa 200 ký tự." };
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn tệp." };
  if (file.size > 15 * 1024 * 1024) return { error: "Tệp tối đa 15MB." };
  if (!isAllowedDocMime(file.type)) return { error: "Định dạng không hỗ trợ (chỉ PDF, ảnh JPG/PNG/WEBP, Word, Excel)." };
  const collaborator = await prisma.collaborator.findUnique({ where: { id: collaboratorId }, select: { id: true } });
  if (!collaborator) return { error: "Không tìm thấy cộng tác viên." };

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isDocumentBufferValid(buffer, file.type)) return { error: "Nội dung tệp không khớp định dạng đã chọn." };
  const storageError = getUploadStorageError();
  if (storageError) return { error: storageError };

  const storedName = safeStoredName(`ctv-${collaboratorId}`, docExt(file.type, file.name));
  const dir = getUploadDir();
  const storedPath = path.join(dir, storedName);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storedPath, buffer);

  try {
    await prisma.$transaction(async (tx) => {
      const document = await tx.collaboratorDocument.create({
        data: { collaboratorId, title, fileName: file.name.slice(0, 200), url: `/media/${storedName}`, mime: file.type, uploadedById: user.id },
      });
      await auditRequired(tx, user.id, "UPLOAD_COLLABORATOR_DOCUMENT", { entity: "CollaboratorDocument", entityId: document.id, meta: { collaboratorId, title, mime: file.type } });
    });
  } catch {
    await fs.rm(storedPath, { force: true }).catch(() => {});
    return { error: "Không thể lưu tài liệu lúc này. Vui lòng thử lại." };
  }

  revalidatePath(`/cong-tac-vien/${encodeURIComponent(collaboratorId)}`);
  return { ok: true, nonce: Date.now() };
}

export async function deleteCollaboratorDocument(formData: FormData): Promise<void> {
  const user = await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "").trim();
  const collaboratorId = String(formData.get("collaboratorId") ?? "").trim();
  if (!id || !collaboratorId) return;

  const document = await prisma.collaboratorDocument.findFirst({ where: { id, collaboratorId }, select: { id: true, url: true } });
  if (!document) return;
  await prisma.$transaction(async (tx) => {
    await tx.collaboratorDocument.delete({ where: { id: document.id } });
    await auditRequired(tx, user.id, "DELETE_COLLABORATOR_DOCUMENT", { entity: "CollaboratorDocument", entityId: document.id, meta: { collaboratorId } });
  });
  const storedName = path.basename(document.url);
  await fs.rm(path.join(getUploadDir(), storedName), { force: true }).catch(() => {});
  revalidatePath(`/cong-tac-vien/${encodeURIComponent(collaboratorId)}`);
}

export async function recordCollaboratorPayout(_prev: CtvState, formData: FormData): Promise<CtvState> {
  const user = await requireUser([...ROLES]);
  const parsed = payoutSchema.safeParse({
    collaboratorId: formData.get("collaboratorId") ?? "",
    amount: formData.get("amount") ?? "",
    month: formData.get("month") ?? "",
    note: formData.get("note") ?? "",
    paymentRequestId: formData.get("paymentRequestId") ?? "",
    paidAt: formData.get("paidAt") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chi hoa hồng không hợp lệ." };
  const d = parsed.data;
  const collaborator = await prisma.collaborator.findUnique({ where: { id: d.collaboratorId }, select: { id: true, name: true } });
  if (!collaborator) return { error: "Không tìm thấy cộng tác viên." };

  let paidAt = new Date();
  if (d.paidAt) {
    const candidate = new Date(`${d.paidAt}T12:00:00`);
    if (Number.isNaN(candidate.getTime())) return { error: "Ngày chuyển khoản không hợp lệ." };
    paidAt = candidate;
  }

  const paymentRequestId = d.paymentRequestId || null;
  if (paymentRequestId) {
    const request = await prisma.paymentRequest.findUnique({ where: { id: paymentRequestId }, select: { type: true, status: true, amount: true, payeeCollaboratorId: true } });
    if (!request) return { error: "Không tìm thấy đề nghị thanh toán." };
    if (request.type !== "COLLABORATOR" || request.status !== "PAID") return { error: "Chỉ được liên kết đề nghị thanh toán hoa hồng đã ở trạng thái Đã chi." };
    if (request.payeeCollaboratorId !== d.collaboratorId) return { error: "Đề nghị thanh toán không thuộc CTV này." };
    if (Number(request.amount) !== d.amount) return { error: "Số tiền phải khớp với đề nghị thanh toán đã chi." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const record = await tx.collaboratorPayoutRecord.create({
        data: { collaboratorId: d.collaboratorId, amount: d.amount, month: d.month, note: d.note || null, paidAt, paidById: user.id, paymentRequestId },
      });
      await auditRequired(tx, user.id, "RECORD_COLLABORATOR_PAYOUT", {
        entity: "CollaboratorPayoutRecord",
        entityId: record.id,
        meta: { collaboratorId: d.collaboratorId, amount: d.amount, month: d.month, paymentRequestId, moneyRecalculated: false },
      });
    });
  } catch {
    return { error: "Không thể ghi nhận khoản chi. Kiểm tra đề nghị thanh toán có thể đã được ghi nhận trước đó." };
  }

  revalidatePath(`/cong-tac-vien/${encodeURIComponent(d.collaboratorId)}`);
  revalidatePath("/cong-tac-vien", "layout");
  return { ok: true, nonce: Date.now() };
}
