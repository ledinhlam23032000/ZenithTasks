"use server";

import { requireCap } from "@/lib/auth";
import type { AiWorkspaceContext } from "@/lib/ai-governance";
import { prisma } from "@/lib/db";
import { archiveAssistantConversation, createNewAssistantConversation, deleteAssistantConversation } from "./conversations";

export async function startNewAssistantConversation(conversationId?: string, workspace?: AiWorkspaceContext) {
  const user = await requireCap("mod:tro-ly");
  if (conversationId) await archiveAssistantConversation(user.id, conversationId);
  const conversation = workspace?.workspaceKind === "PROJECT"
    ? await prisma.assistantConversation.create({ data: { userId: user.id, title: null, workspaceKind: "PROJECT", projectId: workspace.projectId ?? null } })
    : await createNewAssistantConversation(user.id);
  return { ok: true as const, conversationId: conversation.id };
}

export async function removeAssistantConversation(conversationId: string) {
  const user = await requireCap("mod:tro-ly");
  return deleteAssistantConversation(user.id, conversationId);
}
