import Link from "next/link";
import { ShieldAlert, KeyRound } from "lucide-react";
import { requireUser, getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { navForUser } from "@/lib/permissions";
import { securityWarnings } from "@/lib/security-status";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { pushPublicKey } from "@/lib/push";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = navForUser(user).map((n) => ({ href: n.href, label: n.label, icon: n.icon, group: n.group }));
  // Cảnh báo bảo mật chỉ hiện cho ADMIN (người có thể xử lý).
  const warnings = user.role === "ADMIN" ? securityWarnings() : [];
  // Tài khoản bootstrap/QA được đánh dấu bắt buộc đổi mật khẩu trong JWT.
  const session = await getSession();
  const weakPassword = user.mustChangePassword || session?.weakPw === true || session?.mustChangePassword === true;

  return (
    <ToastProvider>
      <AppShell
        user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role], username: user.username, avatarUrl: user.avatarUrl }}
        nav={nav}
        pushPublicKey={pushPublicKey()}
      >
        {(warnings.length > 0 || weakPassword) && (
          <div className="mb-4 space-y-2">
            {weakPassword && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-semibold text-rose-700">Tài khoản của bạn vẫn dùng mật khẩu mặc định</p>
                  <p className="text-rose-600/90">
                    Vì lý do an toàn, hãy đổi mật khẩu ngay tại{" "}
                    <Link href="/tai-khoan" className="underline">
                      Tài khoản
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
            {warnings.map((w) => (
              <div key={w.key} className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-semibold text-rose-700">{w.title}</p>
                  <p className="text-rose-600/90">{w.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {children}
      </AppShell>
    </ToastProvider>
  );
}
