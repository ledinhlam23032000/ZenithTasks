import { Sparkles } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/ui/page-header";
import { AssistantChat } from "./assistant-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trợ lý AI" };

export default async function AssistantPage() {
  await requireCap("mod:tro-ly");
  const aiOn = aiConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trợ lý AI"
        description="Hỏi nhanh về số liệu vận hành: doanh thu, công nợ, dịch vụ bán chạy, khách rời bỏ, tồn kho, khách tham khảo…"
        icon={<Sparkles className="h-5 w-5" />}
      />
      <AssistantChat aiOn={aiOn} />
    </div>
  );
}
