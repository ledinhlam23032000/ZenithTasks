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
  return prisma.assistantMessage.findMany({
    where: { userId, conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { id: true, role: true, content: true, metadata: true, createdAt: true },
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

export function turnsToPrompt(turns: Array<{ role: string; content: string }>) {
  return turns.slice(-20).map((turn) => `${turn.role}: ${turn.content}`).join("\n");
}
