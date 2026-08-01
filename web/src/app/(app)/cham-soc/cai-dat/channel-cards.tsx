import Link from "next/link";
import { MessageCircle, MessageSquareText, PlugZap, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { disconnectChannel, saveResponseTarget } from "./actions";

type ChannelCardData = {
  id: string;
  provider: "ZALO_OA" | "FACEBOOK_PAGE";
  displayName: string;
  status: "CONNECTED" | "DEGRADED" | "REAUTH_REQUIRED" | "DISCONNECTED";
  lastWebhookAt: Date | null;
  lastHealthCheckAt: Date | null;
  lastError: string | null;
  responseTargetMinutes: number | null;
};

const providers = [
  { provider: "ZALO_OA" as const, label: "Zalo Official Account", href: "/api/channels/zalo/connect", icon: MessageCircle },
  { provider: "FACEBOOK_PAGE" as const, label: "Facebook Fanpage", href: "/api/channels/meta/connect", icon: MessageSquareText },
];

export function ChannelCards({ accounts }: { accounts: ChannelCardData[] }) {
  return <div className="grid gap-4 lg:grid-cols-2">
    {providers.map((provider) => {
      const account = accounts.find((item) => item.provider === provider.provider);
      const Icon = provider.icon;
      const connected = account?.status === "CONNECTED";
      return <Card key={provider.provider}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-slate-100 p-2.5"><Icon className="h-5 w-5" /></span>
              <div><h2 className="font-semibold text-slate-900">{provider.label}</h2><p className="text-sm text-slate-500">{account?.displayName ?? "Chưa kết nối"}</p></div>
            </div>
            <Badge tone={connected ? "green" : account?.status === "REAUTH_REQUIRED" ? "red" : "slate"}>{connected ? "Đã kết nối" : account?.status === "REAUTH_REQUIRED" ? "Cần kết nối lại" : "Chưa kết nối"}</Badge>
          </div>
          {account && <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p>Webhook cuối: {account.lastWebhookAt?.toLocaleString("vi-VN") ?? "Chưa có"}</p>
            <p>Kiểm tra sức khỏe: {account.lastHealthCheckAt?.toLocaleString("vi-VN") ?? "Chưa chạy"}</p>
            {account.lastError && <p className="text-red-600">{account.lastError}</p>}
          </div>}
          {account && <form action={saveResponseTarget} className="flex items-end gap-2">
            <input type="hidden" name="id" value={account.id} />
            <label className="flex-1 text-sm text-slate-600">Mục tiêu phản hồi (phút, để trống = tắt)<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" type="number" min="1" max="10080" name="responseTargetMinutes" defaultValue={account.responseTargetMinutes ?? ""} /></label>
            <button className={cn(buttonVariants({ variant: "secondary" }))}>Lưu</button>
          </form>}
          <div className="flex flex-wrap gap-2">
            <Link href={provider.href} className={cn(buttonVariants({ variant: connected ? "secondary" : "primary" }))}><PlugZap className="mr-2 h-4 w-4" />{connected ? "Kết nối lại" : "Kết nối"}</Link>
            {account && account.status !== "DISCONNECTED" && <form action={disconnectChannel}><input type="hidden" name="id" value={account.id} /><button className={cn(buttonVariants({ variant: "ghost" }), "text-red-600")}><Unplug className="mr-2 h-4 w-4" />Ngắt kết nối</button></form>}
          </div>
        </CardContent>
      </Card>;
    })}
  </div>;
}
