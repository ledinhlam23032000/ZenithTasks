"use server";

import { requireCap } from "@/lib/auth";
import { archiveAssistantConversation, createNewAssistantConversation } from "./conversations";

export async function startNewAssistantConversation(conversationId?: string) {
  const user = await requireCap("mod:tro-ly");
  if (conversationId) await archiveAssistantConversation(user.id, conversationId);
  const conversation = await createNewAssistantConversation(user.id);
  return { ok: true as const, conversationId: conversation.id };
}
