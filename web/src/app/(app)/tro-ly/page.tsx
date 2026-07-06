import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { AssistantChat } from "./assistant-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trợ lý AI" };

export default async function AssistantPage() {
  await requireCap("mod:tro-ly");
  const aiOn = aiConfigured();
  return <AssistantChat aiOn={aiOn} />;
}
