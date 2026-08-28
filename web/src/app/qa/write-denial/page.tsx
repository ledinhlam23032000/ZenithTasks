import { redirect } from "next/navigation";
import { V2WorkspaceCustomerForm } from "@/components/v2-workspace-customer-form";
import { V2WorkspaceTaskForm } from "@/components/v2-workspace-task-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function requireQaRuntime() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const looksLikeNonQa = !/(qa|test|staging)/i.test(databaseUrl);
  const looksLikeClinic = /(clinic|production|trungtam|hongphuc)/i.test(databaseUrl);
  if (process.env.QA_CONFIRM !== "YES" || looksLikeNonQa || looksLikeClinic) redirect("/khong-co-quyen");
}

function SentinelSection({ title, projectId, children }: { title: string; projectId: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/60 p-5" data-project-id={projectId}>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">QA sentinel</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">Các form bên dưới cố ý gửi mutation vào company không operational. Expected: server action trả lỗi, không tạo bản ghi.</p>
    </div>
    {children}
  </section>;
}

export default async function QaWriteDenialPage() {
  requireQaRuntime();
  await requireUser(["ADMIN"]);
  return <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">QA-only · MC-13.1</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">Lifecycle write-denial harness</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Trang này chỉ tồn tại khi runtime có QA_CONFIRM=YES và database URL mang dấu hiệu QA/test/staging. Dùng browser client thật để kiểm tra activeOnly guard của server actions trên DRAFT và ARCHIVED.</p>
    </header>
    <div className="grid gap-6 lg:grid-cols-2">
      <SentinelSection title="DRAFT · customer write" projectId="qa-company-draft">
        <V2WorkspaceCustomerForm projectId="qa-company-draft" />
      </SentinelSection>
      <SentinelSection title="DRAFT · task write" projectId="qa-company-draft">
        <V2WorkspaceTaskForm projectId="qa-company-draft" members={[]} />
      </SentinelSection>
      <SentinelSection title="ARCHIVED · customer write" projectId="qa-company-archived">
        <V2WorkspaceCustomerForm projectId="qa-company-archived" />
      </SentinelSection>
      <SentinelSection title="ARCHIVED · task write" projectId="qa-company-archived">
        <V2WorkspaceTaskForm projectId="qa-company-archived" members={[]} />
      </SentinelSection>
    </div>
  </main>;
}
