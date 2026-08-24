import Link from "next/link";
import { ShieldAlert, KeyRound } from "lucide-react";
import { requireUser, getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { navForUser } from "@/lib/permissions";
import { securityWarnings } from "@/lib/security-status";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { pushPublicKey } from "@/lib/push";
import { DismissibleBanner } from "@/components/ui/dismissible-banner";
import { getWorkloadSummary } from "@/lib/workqueue-summary";
import { prisma } from "@/lib/db";
import { normalizedModuleKeys } from "@/lib/v2-modules";
import type { WorkspaceOption } from "@/components/layout/app-shell";

async function loadWorkspaceOptions(user: Awaited<ReturnType<typeof requireUser>>): Promise<WorkspaceOption[]> {
  if (process.env.ENABLE_ZENITH_V2 !== "true") return [];
  try {
    const projects = await prisma.zProject.findMany({
      where: user.role === "ADMIN" ? undefined : { members: { some: { userId: user.id, active: true } } },
      select: { id: true, code: true, name: true, status: true, enabledFeatures: true },
      orderBy: { updatedAt: "desc" },
    });
    return projects.map((project) => ({ id: project.id, code: project.code, name: project.name, status: project.status, enabledFeatures: normalizedModuleKeys(project.enabledFeatures) }));
  } catch (error) {
    console.error("Không tải được danh sách workspace V2:", error);
    return [];
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = navForUser(user).map((n) => ({ href: n.href, label: n.label, icon: n.icon, group: n.group }));
  // Cảnh báo bảo mật chỉ hiện cho ADMIN (người có thể xử lý).
  const warnings = user.role === "ADMIN" ? securityWarnings() : [];
  // Tài khoản bootstrap/QA được đánh dấu bắt buộc đổi mật khẩu trong JWT.
  const [session, workload, workspaces] = await Promise.all([getSession(), getWorkloadSummary(user), loadWorkspaceOptions(user)]);
  const weakPassword = user.mustChangePassword || session?.weakPw === true || session?.mustChangePassword === true;

  return (
    <ToastProvider>
      <AppShell
        user={{ fullName: user.fullName, role: user.role, roleLabel: ROLE_LABELS[user.role], username: user.username, avatarUrl: user.avatarUrl }}
        nav={nav}
        pushPublicKey={pushPublicKey()}
        workload={workload}
        workspaces={workspaces}
      >
        {(warnings.length > 0 || weakPassword) && (
          <div className="mb-4 space-y-2">
            {weakPassword && (
              <DismissibleBanner bannerKey="weak-password" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold">Tài khoản của bạn vẫn dùng mật khẩu mặc định</p>
                    <p className="text-rose-600/90">
                      Vì lý do an toàn, hãy đổi mật khẩu ngay tại{" "}
                      <Link href="/tai-khoan" className="underline">
                        Tài khoản
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </DismissibleBanner>
            )}
            {warnings.map((w) => (
              <DismissibleBanner key={w.key} bannerKey={w.key} className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold">{w.title}</p>
                    <p className="text-rose-600/90">{w.detail}</p>
                  </div>
                </div>
              </DismissibleBanner>
            ))}
          </div>
        )}
        {children}
      </AppShell>
    </ToastProvider>
  );
}
