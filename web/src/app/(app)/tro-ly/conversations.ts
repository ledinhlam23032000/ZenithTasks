import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AssistantTurn = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

export async function getOrCreateAssistantConversation(userId: string, conversationId?: string | null) {
  if (conversationId) {
    const existing = await prisma.assistantConversation.findFirst({ where: { id: conversationId, userId } });
    if (existing) return existing;
  }
  const latest = await prisma.assistantConversation.findFirst({
    where: { userId, status: "OPEN" },
    orderBy: { lastMessageAt: "desc" },
  });
  return latest ?? prisma.assistantConversation.create({ data: { userId, title: null } });
}

export async function listAssistantConversations(userId: string) {
  return prisma.assistantConversation.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: 30,
    select: { id: true, title: true, status: true, lastMessageAt: true },
  });
}

export async function getAssistantConversationTurns(userId: string, conversationId: string) {
  const messages = await prisma.assistantMessage.findMany({
    where: { userId, conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { id: true, role: true, content: true, metadata: true, createdAt: true },
  });
  const approvalIds = messages.flatMap((message) => {
    if (!message.metadata || typeof message.metadata !== "object" || Array.isArray(message.metadata)) return [];
    const approval = (message.metadata as Record<string, unknown>).approval;
    if (!approval || typeof approval !== "object" || Array.isArray(approval)) return [];
    const id = (approval as Record<string, unknown>).id;
    return typeof id === "string" ? [id] : [];
  });
  if (approvalIds.length === 0) return messages;
  const approvals = await prisma.assistantApproval.findMany({ where: { userId, id: { in: approvalIds } }, select: { id: true, status: true } });
  const statusById = new Map(approvals.map((approval) => [approval.id, approval.status]));
  return messages.map((message) => {
    if (!message.metadata || typeof message.metadata !== "object" || Array.isArray(message.metadata)) return message;
    const metadata = message.metadata as Record<string, unknown>;
    const approval = metadata.approval;
    if (!approval || typeof approval !== "object" || Array.isArray(approval)) return message;
    const approvalId = (approval as Record<string, unknown>).id;
    if (typeof approvalId !== "string" || statusById.get(approvalId) === "PENDING") return message;
    const { approval: _staleApproval, ...rest } = metadata;
    return { ...message, metadata: rest };
  });
}

export async function appendAssistantTurn(
  userId: string,
  conversationId: string,
  role: AssistantTurn["role"],
  content: string,
  metadata?: Prisma.InputJsonValue,
) {
  const text = content.trim();
  if (!text) return null;
  const message = await prisma.assistantMessage.create({
    data: { userId, conversationId, role, content: text, metadata },
    select: { id: true, role: true, content: true, metadata: true, createdAt: true },
  });
  await prisma.assistantConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: message.createdAt,
      ...(role === "USER" ? { title: text.slice(0, 100) } : {}),
    },
  });
  return message;
}

export async function archiveAssistantConversation(userId: string, conversationId: string) {
  await prisma.assistantConversation.updateMany({ where: { id: conversationId, userId }, data: { status: "ARCHIVED" } });
}

export async function createNewAssistantConversation(userId: string) {
  return prisma.assistantConversation.create({ data: { userId, title: null } });
}

export async function deleteAssistantConversation(userId: string, conversationId: string) {
  const conversation = await prisma.assistantConversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
  if (!conversation) return { ok: false as const, error: "Không tìm thấy cuộc trò chuyện hoặc anh không có quyền xóa." };
  await prisma.$transaction(async (tx) => {
    await tx.assistantApproval.updateMany({ where: { conversationId, userId, status: "PENDING" }, data: { status: "REJECTED", resolvedAt: new Date(), conversationId: null } });
    await tx.assistantConversation.delete({ where: { id: conversationId } });
  });
  return { ok: true as const };
}

export function turnsToPrompt(turns: Array<{ role: string; content: string }>) {
  return turns.slice(-20).map((turn) => `${turn.role}: ${turn.content}`).join("\n");
}
