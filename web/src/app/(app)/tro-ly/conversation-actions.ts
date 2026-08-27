"use server";

import { requireCap } from "@/lib/auth";
import { requireV2User } from "@/lib/v2-access";
import { resolveRuntimeAiAgent } from "@/lib/v2-ai-agent-runtime";
import type { AiWorkspaceContext } from "@/lib/ai-governance";
import { archiveAssistantConversation, createNewAssistantConversation, deleteAssistantConversation } from "./conversations";

export async function startNewAssistantConversation(conversationId?: string, workspace?: AiWorkspaceContext) {
  const user = workspace?.workspaceKind === "PROJECT" ? await requireV2User() : await requireCap("mod:tro-ly");
  if (workspace?.workspaceKind === "GLOBAL" && user.role !== "ADMIN") return { ok: false as const, error: "Chỉ Global Admin được mở phạm vi Toàn hệ thống." };
  const runtimeAgentResult = await resolveRuntimeAiAgent(user, workspace ?? { workspaceKind: "INTERNAL" });
  if (!runtimeAgentResult.ok) return { ok: false as const, error: runtimeAgentResult.reason };
  if (conversationId) await archiveAssistantConversation(user.id, conversationId);
  const selectedWorkspace = workspace ?? { workspaceKind: "INTERNAL" as const };
  const conversation = await createNewAssistantConversation(user.id, selectedWorkspace.workspaceKind, selectedWorkspace.workspaceKind === "GLOBAL" ? undefined : selectedWorkspace.projectId, runtimeAgentResult.agent?.id);
  return { ok: true as const, conversationId: conversation.id };
}

export async function removeAssistantConversation(conversationId: string) {
  const user = await requireCap("mod:tro-ly");
  return deleteAssistantConversation(user.id, conversationId);
}
