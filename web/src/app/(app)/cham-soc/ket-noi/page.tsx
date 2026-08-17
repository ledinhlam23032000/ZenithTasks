import { Plug, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { zaloConfigured } from "@/lib/channels/zalo";
import { facebookWebhookConfigured } from "@/lib/channels/facebook";
import { originFromHeaders } from "@/lib/request-origin";
import { ChannelAccountRow } from "./channel-account-row";
import { ConnectFacebookModal } from "./connect-facebook-modal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kết nối kênh — Chăm sóc khách hàng" };

export default async function ChannelSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ zalo?: string; zalo_error?: string }>;
}) {
  await requireCap("mod:ket-noi-kenh");
  const sp = await searchParams;
  const origin = await originFromHeaders();

  const accounts = await prisma.channelAccount.findMany({
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    include: { connectedBy: { select: { fullName: true } } },
  });
  const zaloAccounts = accounts.filter((a) => a.kind === "ZALO_OA");
  const fbAccounts = accounts.filter((a) => a.kind === "FACEBOOK");

  const zaloAppReady = zaloConfigured();
  const zaloWebhookReady = Boolean((process.env.ZALO_OA_SECRET_KEY ?? "").trim());
  const fbReady = facebookWebhookConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kết nối kênh"
        description="Kết nối Zalo OA + Facebook Page để tin nhắn khách tự động gộp vào Hộp thư. Chỉ Quản trị viên thấy trang này."
        icon={<Plug className="h-5 w-5" />}
      />

      {sp.zalo && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Đã kết nối Zalo OA &quot;{sp.zalo}&quot; thành công.
        </div>
      )}
      {sp.zalo_error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <XCircle className="h-4 w-4 shrink-0" /> {sp.zalo_error}
        </div>
      )}

      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="flex gap-3 py-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Lưu ý quan trọng:</span> tính năng này CHỈ dùng được với <span className="font-semibold">Zalo Official
            Account (OA)</span> đăng ký chính thức tại <span className="font-mono">oa.zalo.me</span> — Zalo cá nhân KHÔNG có API chính thức. Mọi
            công cụ &quot;tự động hoá Zalo cá nhân&quot; trên mạng đều là bẻ khoá trái phép, vi phạm điều khoản và rất dễ bị Zalo khoá số — hệ
            thống KHÔNG dùng loại công cụ này.
          </p>
        </CardContent>
      </Card>

      {/* ===== Zalo OA ===== */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Zalo OA</CardTitle>
            <CardDescription>Nhắn/nhận tin qua Official Account của phòng khám.</CardDescription>
          </div>
          {zaloAppReady ? (
            <a href="/api/integrations/zalo/connect" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Kết nối Zalo OA
            </a>
          ) : (
            <Badge tone="amber">Chưa cấu hình ZALO_APP_ID/SECRET</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {zaloAccounts.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa kết nối Zalo OA nào.</p>
          ) : (
            zaloAccounts.map((a) => (
              <ChannelAccountRow
                key={a.id}
                id={a.id}
                kind={a.kind}
                label={a.label}
                active={a.active}
                tokenExpiresLabel={a.tokenExpiresAt ? fmtDateTime(a.tokenExpiresAt) : undefined}
                connectedByName={a.connectedBy?.fullName}
              />
            ))
          )}

          <details className="rounded-xl border border-slate-100 p-3.5 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">Cách lấy thông tin để kết nối (bấm xem)</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                Đăng ký/đăng nhập Official Account tại <span className="font-mono">oa.zalo.me</span> (cần Zalo OA đã xác thực, không phải Zalo cá
                nhân thường).
              </li>
              <li>
                Vào <span className="font-mono">developers.zalo.me</span> → tạo ứng dụng → liên kết với OA ở trên → lấy{" "}
                <span className="font-medium">App ID</span> và <span className="font-medium">Secret Key</span>.
              </li>
              <li>
                Khai báo redirect URL trong cấu hình app: <code className="break-all rounded bg-slate-100 px-1.5 py-0.5">{origin}/api/integrations/zalo/callback</code>
              </li>
              <li>
                Trong trang quản trị OA (business.zalo.me) → mục Webhook → khai URL nhận sự kiện:{" "}
                <code className="break-all rounded bg-slate-100 px-1.5 py-0.5">{origin}/api/webhooks/zalo</code> — và lấy{" "}
                <span className="font-medium">Secret Key</span> của OA (dùng để hệ thống kiểm chữ ký tin đến).
              </li>
              <li>
                Đưa <span className="font-mono">ZALO_APP_ID</span>, <span className="font-mono">ZALO_APP_SECRET</span>,{" "}
                <span className="font-mono">ZALO_OA_SECRET_KEY</span> vào file <span className="font-mono">.env</span> trên máy chủ rồi khởi động
                lại (xem <span className="font-mono">web/.env.example</span>) — sau đó quay lại đây bấm &quot;Kết nối Zalo OA&quot;.
              </li>
            </ol>
            <p className="mt-2 text-xs text-slate-400">
              Trạng thái máy chủ hiện tại: App ID/Secret {zaloAppReady ? "đã có" : "CHƯA có"} · Webhook Secret Key {zaloWebhookReady ? "đã có" : "CHƯA có"}.
            </p>
          </details>
        </CardContent>
      </Card>

      {/* ===== Facebook Page ===== */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Facebook Messenger (Fanpage)</CardTitle>
            <CardDescription>Nhắn/nhận tin qua Fanpage của phòng khám.</CardDescription>
          </div>
          <ConnectFacebookModal />
        </CardHeader>
        <CardContent className="space-y-3">
          {fbAccounts.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa kết nối Facebook Page nào.</p>
          ) : (
            fbAccounts.map((a) => (
              <ChannelAccountRow
                key={a.id}
                id={a.id}
                kind={a.kind}
                label={a.label}
                active={a.active}
                connectedByName={a.connectedBy?.fullName}
              />
            ))
          )}

          <details className="rounded-xl border border-slate-100 p-3.5 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">Cách bật webhook để NHẬN tin (bấm xem)</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                Tạo 1 App tại <span className="font-mono">developers.facebook.com</span>, thêm sản phẩm{" "}
                <span className="font-medium">Messenger</span>, liên kết với Fanpage của phòng khám.
              </li>
              <li>
                Trong mục Messenger → Webhook, khai URL: <code className="break-all rounded bg-slate-100 px-1.5 py-0.5">{origin}/api/webhooks/facebook</code>
              </li>
              <li>
                Đặt 1 chuỗi bất kỳ làm &quot;Verify Token&quot; lúc khai webhook, rồi đưa ĐÚNG chuỗi đó vào{" "}
                <span className="font-mono">FB_VERIFY_TOKEN</span> trong file <span className="font-mono">.env</span> trên máy chủ.
              </li>
              <li>
                Lấy <span className="font-medium">App Secret</span> (Cài đặt → Cơ bản) đưa vào <span className="font-mono">FB_APP_SECRET</span> —
                dùng để hệ thống kiểm chữ ký tin đến.
              </li>
              <li>Đăng ký sự kiện (subscribe) đúng Fanpage với trường messages/messaging_postbacks trong mục Webhook.</li>
              <li>Khởi động lại máy chủ sau khi đổi .env, rồi kết nối Page Access Token ở nút &quot;Kết nối Facebook Page&quot; phía trên.</li>
            </ol>
            <p className="mt-2 text-xs text-slate-400">Trạng thái máy chủ hiện tại: FB_APP_SECRET/FB_VERIFY_TOKEN {fbReady ? "đã có" : "CHƯA có"}.</p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
