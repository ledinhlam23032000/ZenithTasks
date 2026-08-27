import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { redirect } from "next/navigation";
import { requireV2User } from "@/lib/v2-access";
import { resolveRuntimeAiAgent } from "@/lib/v2-ai-agent-runtime";
import { prisma } from "@/lib/db";
import { normalizedModuleKeys } from "@/lib/v2-modules";
import { shortName } from "@/lib/format";
import { AssistantChat } from "./assistant-chat";
import { ConversationHistory } from "./conversation-history";
import { getAssistantConversationTurns, getOrCreateAssistantConversation, listAssistantConversations } from "./conversations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trợ lý AI" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string; p?: string }> }) {
  const sp = await searchParams;
  const selectedValue = String(sp.p ?? "").trim();
  const user = selectedValue && selectedValue !== "__GLOBAL__" ? await requireV2User() : await requireCap("mod:tro-ly");
  const aiOn = aiConfigured();
  const workspaceOptions = process.env.ENABLE_ZENITH_V2 === "true"
    ? await prisma.zProject.findMany({ where: user.role === "ADMIN" ? { status: "ACTIVE" } : { status: "ACTIVE", members: { some: { userId: user.id, active: true } } }, select: { id: true, code: true, name: true, status: true, enabledFeatures: true }, orderBy: { updatedAt: "desc" } })
    : [];
  const selected = workspaceOptions.find((item) => item.id === selectedValue);
  if (selectedValue && selectedValue !== "__GLOBAL__" && !selected) redirect("/khong-co-quyen");
  const selectedWorkspaceKind: "INTERNAL" | "PROJECT" | "GLOBAL" = selectedValue === "__GLOBAL__" && user.role === "ADMIN" ? "GLOBAL" : selected ? "PROJECT" : "INTERNAL";
  const runtimeAgentResult = await resolveRuntimeAiAgent(user, selectedWorkspaceKind === "PROJECT" ? { workspaceKind: "PROJECT", projectId: selected?.id ?? "" } : { workspaceKind: selectedWorkspaceKind });
  const selectedAgentId = runtimeAgentResult.ok ? runtimeAgentResult.agent?.id : undefined;
  const conversation = await getOrCreateAssistantConversation(user.id, sp.c, selectedWorkspaceKind, selected?.id, selectedAgentId);
  const messages = await getAssistantConversationTurns(user.id, conversation.id);
  const history = await listAssistantConversations(user.id);
  return (
    <div className="grid min-h-[calc(100vh-10.5rem)] gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch sử trợ lý</p>
          <span className="text-[11px] text-slate-400">{history.length}</span>
        </div>
        <ConversationHistory history={history} currentId={conversation.id} />
      </aside>
      <AssistantChat
        aiOn={aiOn}
        greetName={shortName(user.fullName)}
        conversationId={conversation.id}
        initialMessages={messages}
        workspaceOptions={workspaceOptions.map((item) => ({ id: item.id, code: item.code, name: item.name, enabledFeatures: normalizedModuleKeys(item.enabledFeatures) }))}
        selectedProjectId={selected?.id ?? (selectedWorkspaceKind === "GLOBAL" ? "__GLOBAL__" : "")}
        selectedAgentId={selectedAgentId}
        allowGlobal={user.role === "ADMIN"}
      />
    </div>
  );
}
