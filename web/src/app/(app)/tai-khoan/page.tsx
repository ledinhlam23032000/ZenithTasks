import { UserCog, ShieldCheck, IdCard, KeyRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarUploader, ProfileInfoForm, PasswordForm } from "./profile-forms";
import { TwoFactor } from "./two-factor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thông tin cá nhân" };

export default async function ProfilePage() {
  const user = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabled: true } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông tin cá nhân"
        description="Cập nhật họ tên, số điện thoại, ảnh đại diện và mật khẩu của tài khoản bạn."
        icon={<UserCog className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ảnh đại diện</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <AvatarUploader name={user.fullName} avatarUrl={user.avatarUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1">
              <IdCard className="h-4 w-4 text-slate-400" /> @{user.username}
            </span>
            <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
            {user.code && <span className="text-xs text-slate-400">Mã NV: {user.code}</span>}
          </div>
          <ProfileInfoForm fullName={user.fullName} phone={user.phone ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Đổi mật khẩu
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-600" /> Xác thực 2 lớp (2FA)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TwoFactor enabled={!!me?.totpEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
