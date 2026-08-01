import { Settings2 } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ChannelCards } from "./channel-cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kết nối kênh chăm sóc" };

export default async function ChannelSettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  await requireCap("inbox.manageChannels");
  const params = await searchParams;
  const accounts = await prisma.channelAccount.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, provider: true, displayName: true, status: true, lastWebhookAt: true, lastHealthCheckAt: true, lastError: true, responseTargetMinutes: true },
  });
  return <div className="space-y-6">
    <PageHeader title="Kết nối kênh chăm sóc" description="Đăng nhập tài khoản quản trị để nhận tin nhắn mới và trả lời ngay trong ZenithTasks." icon={<Settings2 className="h-5 w-5" />} />
    {params.connected && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Kết nối thành công. ZenithTasks bắt đầu nhận các tin mới từ thời điểm này.</div>}
    {params.error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div>}
    <ChannelCards accounts={accounts} />
    <p className="text-xs text-slate-500">Access token và refresh token được mã hóa ở máy chủ, không hiển thị trên trang này và không được lưu trong Git.</p>
  </div>;
}
