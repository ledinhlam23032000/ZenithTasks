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
import { confirmSecondApprovalFromList, listPendingSecondApprovals } from "./agent";

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
  const pendingSecond = user.role === "ADMIN" ? await listPendingSecondApprovals() : [];
  return (
    <div className="grid min-h-[calc(100vh-10.5rem)] gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch sử trợ lý</p>
          <span className="text-[11px] text-slate-400">{history.length}</span>
        </div>
        <ConversationHistory history={history} currentId={conversation.id} />
      </aside>
      <div className="flex min-h-0 flex-col gap-4">
        {pendingSecond.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="mb-2 text-sm font-bold text-rose-800">
              Chờ ADMIN khác xác nhận lần 2 ({pendingSecond.length}) — thao tác rủi ro cao, đã có 1 người duyệt
            </p>
            <ul className="space-y-2">
              {pendingSecond.map((item) => (
                <li key={item.id} className="rounded-xl border border-rose-200 bg-white p-3 text-sm">
                  <p className="text-xs text-slate-500">
                    {item.toolName} · lần 1 bởi {item.firstApprovedByUser?.fullName ?? "?"}
                    {item.firstApprovedAt ? ` · ${item.firstApprovedAt.toLocaleString("vi-VN")}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{String(item.preview)}</p>
                  <form action={confirmSecondApprovalFromList} className="mt-2 flex gap-2">
                    <input type="hidden" name="approvalId" value={item.id} />
                    <button type="submit" className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
                      Xác nhận lần 2 (thực thi ngay)
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
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
    </div>
  );
}
