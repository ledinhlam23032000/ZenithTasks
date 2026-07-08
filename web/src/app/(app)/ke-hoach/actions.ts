"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { aiConfigured, generateMessage } from "@/lib/ai";
import { PLAN_ROLES } from "@/lib/plans";
import { PLAN_DRAFT_SYSTEM, buildPlanDraftPrompt, parsePlanDraft, planDraftSchema, type PlanDraft } from "@/lib/plan-ai";

export type PlanFormState = { ok?: boolean; error?: string; nonce?: number };
export type TaskFormState = { ok?: boolean; error?: string; nonce?: number };
export type PlanDraftState = { ok?: boolean; draft?: PlanDraft; error?: string };

const planSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên kế hoạch.").max(160),
  note: z.string().trim().max(2000).optional(),
});

/** Tạo kế hoạch mới. Cặp với useFormAction, chuyển thẳng vào trang chi tiết. */
export async function createPlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireUser([...PLAN_ROLES]);
  const parsed = planSchema.safeParse({ title: formData.get("title") ?? "", note: formData.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const plan = await prisma.plan.create({ data: { title: parsed.data.title, note: parsed.data.note || null, createdById: user.id } });
  await audit(user.id, "CREATE_PLAN", { entity: "Plan", entityId: plan.id });
  redirect(`/ke-hoach/${plan.id}`);
}

const editPlanSchema = planSchema.extend({ id: z.string().min(1) });

/** Sửa tên/ghi chú kế hoạch. Cặp với useFormAction → không revalidate. */
export async function updatePlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireUser([...PLAN_ROLES]);
  const parsed = editPlanSchema.safeParse({ id: formData.get("id") ?? "", title: formData.get("title") ?? "", note: formData.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.plan.update({ where: { id: parsed.data.id }, data: { title: parsed.data.title, note: parsed.data.note || null } });
  await audit(user.id, "UPDATE_PLAN", { entity: "Plan", entityId: parsed.data.id });
  return { ok: true, nonce: Date.now() };
}

/** Xóa kế hoạch (cascade toàn bộ nhiệm vụ). Dùng với DeleteButton — luôn điều hướng về danh sách. */
export async function deletePlan(formData: FormData): Promise<void> {
  const user = await requireUser([...PLAN_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/ke-hoach");
  await prisma.plan.delete({ where: { id } }).catch(() => {});
  await audit(user.id, "DELETE_PLAN", { entity: "Plan", entityId: id });
  redirect("/ke-hoach");
}

const taskSchema = z.object({
  planId: z.string().min(1),
  title: z.string().trim().min(1, "Vui lòng nhập tên nhiệm vụ.").max(200),
  note: z.string().trim().max(2000).optional(),
});

/** Thêm nhiệm vụ chính (parentId = null), tự nối cuối danh sách hiện có. */
export async function createTask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireUser([...PLAN_ROLES]);
  const parsed = taskSchema.safeParse({
    planId: formData.get("planId") ?? "",
    title: formData.get("title") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const max = await prisma.planTask.aggregate({ where: { planId: d.planId, parentId: null }, _max: { order: true } });
  await prisma.planTask.create({ data: { planId: d.planId, title: d.title, note: d.note || null, order: (max._max.order ?? -1) + 1 } });
  await audit(user.id, "CREATE_PLAN_TASK", { entity: "PlanTask", meta: { planId: d.planId } });
  return { ok: true, nonce: Date.now() };
}

const subtaskSchema = z.object({
  parentId: z.string().min(1),
  title: z.string().trim().min(1, "Vui lòng nhập tên nhiệm vụ phụ.").max(200),
  note: z.string().trim().max(2000).optional(),
});

/** Thêm nhiệm vụ phụ — chỉ 2 cấp: chặn nếu cha đã là 1 nhiệm vụ phụ. */
export async function createSubtask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireUser([...PLAN_ROLES]);
  const parsed = subtaskSchema.safeParse({
    parentId: formData.get("parentId") ?? "",
    title: formData.get("title") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const parent = await prisma.planTask.findUnique({ where: { id: d.parentId }, select: { planId: true, parentId: true } });
  if (!parent) return { error: "Không tìm thấy nhiệm vụ chính." };
  if (parent.parentId !== null) return { error: "Không thể tạo nhiệm vụ phụ trong nhiệm vụ phụ (chỉ hỗ trợ 2 cấp)." };
  const max = await prisma.planTask.aggregate({ where: { parentId: d.parentId }, _max: { order: true } });
  await prisma.planTask.create({
    data: { planId: parent.planId, parentId: d.parentId, title: d.title, note: d.note || null, order: (max._max.order ?? -1) + 1 },
  });
  await audit(user.id, "CREATE_PLAN_TASK", { entity: "PlanTask", meta: { parentId: d.parentId } });
  return { ok: true, nonce: Date.now() };
}

const updateTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Vui lòng nhập tên nhiệm vụ.").max(200),
  note: z.string().trim().max(2000).optional(),
});

/** Sửa tiêu đề/ghi chú 1 nhiệm vụ (chính hoặc phụ — cùng model). */
export async function updateTask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireUser([...PLAN_ROLES]);
  const parsed = updateTaskSchema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.planTask.update({ where: { id: parsed.data.id }, data: { title: parsed.data.title, note: parsed.data.note || null } });
  await audit(user.id, "UPDATE_PLAN_TASK", { entity: "PlanTask", entityId: parsed.data.id });
  return { ok: true, nonce: Date.now() };
}

/** Xóa 1 nhiệm vụ (cascade nhiệm vụ phụ nếu là nhiệm vụ chính). Dùng với DeleteButton. */
export async function deleteTask(formData: FormData): Promise<void> {
  const user = await requireUser([...PLAN_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.planTask.delete({ where: { id } }).catch(() => {});
  await audit(user.id, "DELETE_PLAN_TASK", { entity: "PlanTask", entityId: id });
}

/** Bật/tắt hoàn thành — thao tác "câm" gọi trực tiếp qua useTransition (không revalidate). */
export async function setTaskStatus(formData: FormData): Promise<void> {
  const user = await requireUser([...PLAN_ROLES]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["TODO", "IN_PROGRESS", "DONE"].includes(status)) return;
  await prisma.planTask.update({ where: { id }, data: { status: status as "TODO" | "IN_PROGRESS" | "DONE" } }).catch(() => {});
  await audit(user.id, "SET_PLAN_TASK_STATUS", { entity: "PlanTask", entityId: id, meta: { status } });
}

/** Đổi thứ tự với phần tử liền kề CÙNG cấp (cùng planId + cùng parentId). */
export async function reorderTask(formData: FormData): Promise<void> {
  await requireUser([...PLAN_ROLES]);
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;
  const task = await prisma.planTask.findUnique({ where: { id }, select: { planId: true, parentId: true, order: true } });
  if (!task) return;
  const sibling = await prisma.planTask.findFirst({
    where: { planId: task.planId, parentId: task.parentId, order: direction === "up" ? { lt: task.order } : { gt: task.order } },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!sibling) return;
  await prisma.$transaction([
    prisma.planTask.update({ where: { id }, data: { order: sibling.order } }),
    prisma.planTask.update({ where: { id: sibling.id }, data: { order: task.order } }),
  ]);
}

/**
 * AI soạn BẢN NHÁP kế hoạch (KHÔNG lưu DB) — gọi trực tiếp qua useTransition (giống askAssistant),
 * trả draft để client hiển thị xem/sửa trước khi bấm lưu thật (createPlanFromDraft).
 */
export async function generatePlanDraft(_prev: PlanDraftState, formData: FormData): Promise<PlanDraftState> {
  const user = await requireUser([...PLAN_ROLES]);
  if (!aiConfigured()) return { error: "Chưa bật AI. Vào máy chủ chạy Cai-AI-Key rồi thử lại." };
  const goal = String(formData.get("goal") ?? "").trim();
  if (!goal) return { error: "Vui lòng mô tả mục tiêu kế hoạch." };
  if (goal.length > 800) return { error: "Mô tả quá dài (tối đa 800 ký tự)." };

  let r = await generateMessage({ system: PLAN_DRAFT_SYSTEM, prompt: buildPlanDraftPrompt(goal), maxTokens: 2200 });
  let parsed = r.ok ? parsePlanDraft(r.text) : null;
  if (r.ok && parsed && !parsed.ok) {
    // Tự thử lại 1 lần với lời nhắc mạnh hơn trước khi báo lỗi cho người dùng.
    r = await generateMessage({ system: PLAN_DRAFT_SYSTEM, prompt: buildPlanDraftPrompt(goal, true), maxTokens: 2200 });
    parsed = r.ok ? parsePlanDraft(r.text) : null;
  }
  await audit(user.id, "GENERATE_PLAN_DRAFT", { entity: "Plan", meta: { ok: r.ok && !!parsed?.ok } });
  if (!r.ok) return { error: r.error };
  if (!parsed?.ok) return { error: parsed?.error ?? "Không tạo được kế hoạch, vui lòng thử lại." };
  return { ok: true, draft: parsed.draft };
}

/** Lưu bản nháp (đã người dùng xem/sửa) thành kế hoạch thật — validate lại toàn bộ, tạo nguyên tử. */
export async function createPlanFromDraft(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const user = await requireUser([...PLAN_ROLES]);
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("draft") ?? ""));
  } catch {
    return { error: "Dữ liệu kế hoạch không hợp lệ." };
  }
  const parsed = planDraftSchema.safeParse(raw);
  if (!parsed.success) return { error: "Dữ liệu kế hoạch không hợp lệ (thiếu tiêu đề hoặc quá nhiều nhiệm vụ)." };
  const d = parsed.data;

  const plan = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({ data: { title: d.title, note: d.note || null, aiGenerated: true, createdById: user.id } });
    for (const [ti, t] of d.tasks.entries()) {
      const task = await tx.planTask.create({ data: { planId: plan.id, title: t.title, note: t.note || null, order: ti } });
      for (const [si, s] of t.subtasks.entries()) {
        await tx.planTask.create({ data: { planId: plan.id, parentId: task.id, title: s.title, note: s.note || null, order: si } });
      }
    }
    return plan;
  });
  await audit(user.id, "CREATE_PLAN_FROM_AI", { entity: "Plan", entityId: plan.id, meta: { taskCount: d.tasks.length } });
  redirect(`/ke-hoach/${plan.id}`);
}
