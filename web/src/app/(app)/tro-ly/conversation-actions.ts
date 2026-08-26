"use server";

import { requireCap } from "@/lib/auth";
import type { AiWorkspaceContext } from "@/lib/ai-governance";
import { prisma } from "@/lib/db";
import { archiveAssistantConversation, createNewAssistantConversation, deleteAssistantConversation } from "./conversations";

export async function startNewAssistantConversation(conversationId?: string, workspace?: AiWorkspaceContext) {
  const user = await requireCap("mod:tro-ly");
  if (workspace?.workspaceKind === "GLOBAL" && user.role !== "ADMIN") return { ok: false as const, error: "Chỉ Global Admin được mở phạm vi Toàn hệ thống." };
  if (conversationId) await archiveAssistantConversation(user.id, conversationId);
  const conversation = workspace?.workspaceKind === "PROJECT" || workspace?.workspaceKind === "GLOBAL"
    ? await prisma.assistantConversation.create({ data: { userId: user.id, title: null, workspaceKind: workspace.workspaceKind, projectId: workspace.workspaceKind === "GLOBAL" ? null : workspace.projectId ?? null } })
    : await createNewAssistantConversation(user.id);
  return { ok: true as const, conversationId: conversation.id };
}

export async function removeAssistantConversation(conversationId: string) {
  const user = await requireCap("mod:tro-ly");
  return deleteAssistantConversation(user.id, conversationId);
}
