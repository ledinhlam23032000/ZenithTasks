import { ServerCog, ShieldAlert, ShieldCheck, Database, Image as ImageIcon, HardDriveDownload, Users, FolderHeart, Wallet } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getSystemStatus, humanBytes } from "@/lib/system-status";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tình trạng hệ thống" };

export default async function SystemPage() {
  await requireCap("mod:he-thong");
  const s = await getSystemStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tình trạng hệ thống"
        description="Cảnh báo bảo mật, quy mô dữ liệu, dung lượng lưu trữ và sao lưu. Dành cho quản trị viên."
        icon={<ServerCog className="h-5 w-5" />}
      />

      {/* Cảnh báo bảo mật */}
      {s.warnings.length > 0 ? (
        <div className="space-y-2">
          {s.warnings.map((w) => (
            <div key={w.key} className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-700">{w.title}</p>
                <p className="text-rose-600/90">{w.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <p className="font-medium text-emerald-700">Không phát hiện cảnh báo bảo mật.</p>
        </div>
      )}

      {/* Sao lưu */}
      <Card className={s.backup.ok ? "border-emerald-200" : "border-amber-300"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDriveDownload className="h-4 w-4 text-slate-400" /> Sao lưu dữ liệu
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {s.backup.lastBackupAt ? (
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-slate-500">Lần gần nhất:</span>
                <span className="font-medium text-slate-800">{fmtDateTime(s.backup.lastBackupAt)}</span>
                <Badge tone={s.backup.ok ? "green" : "amber"}>{fmtRelative(s.backup.lastBackupAt)}</Badge>
              </p>
              {s.backup.sizeBytes ? <p className="text-slate-500">Kích thước: {humanBytes(s.backup.sizeBytes)}</p> : null}
              {s.backup.error && <p className="text-rose-600">Lỗi backup gần nhất: {s.backup.error}</p>}
              {!s.backup.ok && !s.backup.error && (
                <p className="text-amber-600">⚠️ Đã quá 48 giờ chưa có bản sao lưu mới — kiểm tra lịch sao lưu.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              Chưa ghi nhận lần sao lưu tự động nào. Bật bằng lệnh <code className="rounded bg-slate-100 px-1">npm run backup</code> (hoặc
              lịch sao lưu trong container). Ngoài ra <code className="rounded bg-slate-100 px-1">windows/Sao-Luu.ps1</code> sao lưu thủ công ra ổ ngoài / Google Drive.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quy mô dữ liệu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Khách hàng" value={s.data.customers.toLocaleString("vi-VN")} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Hồ sơ điều trị" value={s.data.cases.toLocaleString("vi-VN")} icon={<FolderHeart className="h-5 w-5" />} tone="purple" />
        <StatCard label="Hồ sơ còn nợ" value={s.data.openDebtCount.toLocaleString("vi-VN")} icon={<Wallet className="h-5 w-5" />} tone={s.data.openDebtCount > 0 ? "red" : "slate"} />
        <StatCard label="Nhân sự đang hoạt động" value={s.data.activeUsers.toLocaleString("vi-VN")} icon={<Users className="h-5 w-5" />} tone="blue" />
      </div>

      {/* Lưu trữ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Kích thước CSDL" value={humanBytes(s.storage.dbBytes)} icon={<Database className="h-5 w-5" />} tone="slate" />
        <StatCard label="Dung lượng ảnh" value={humanBytes(s.storage.uploadsBytes)} sub={`${s.storage.uploadsCount.toLocaleString("vi-VN")} tệp`} icon={<ImageIcon className="h-5 w-5" />} tone="slate" />
        <StatCard label="Số ảnh (DB)" value={s.data.photos.toLocaleString("vi-VN")} icon={<ImageIcon className="h-5 w-5" />} tone="slate" />
      </div>

      {/* Hoạt động gần đây (audit) */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động nhạy cảm gần đây</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {s.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có nhật ký.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {s.recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2">
                    <Badge tone="slate">{a.action}</Badge>
                    <span className="text-slate-600">{a.actor}</span>
                    {a.entity && <span className="text-xs text-slate-400">· {a.entity}</span>}
                  </span>
                  <span className="text-xs text-slate-400">{fmtDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">Xem đầy đủ tại trang “Nhật ký hệ thống”.</p>
        </CardContent>
      </Card>
    </div>
  );
}
