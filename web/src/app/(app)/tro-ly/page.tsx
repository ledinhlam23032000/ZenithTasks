import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { shortName } from "@/lib/format";
import { AssistantChat } from "./assistant-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trợ lý AI" };

export default async function AssistantPage() {
  const user = await requireCap("mod:tro-ly");
  const aiOn = aiConfigured();
  return <AssistantChat aiOn={aiOn} greetName={shortName(user.fullName)} />;
}
