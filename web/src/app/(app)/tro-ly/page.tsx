import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { PageTabs } from "@/components/ui/page-tabs";
import { reportTabs } from "@/lib/nav-tabs";
import { AssistantChat } from "./assistant-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trợ lý AI" };

export default async function AssistantPage() {
  const user = await requireCap("mod:tro-ly");
  const aiOn = aiConfigured();
  return (
    <div className="space-y-3">
      <PageTabs tabs={reportTabs(user)} />
      <AssistantChat aiOn={aiOn} />
    </div>
  );
}
