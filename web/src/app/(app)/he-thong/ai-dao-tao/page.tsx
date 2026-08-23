import { Bot, Database, FlaskConical, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AiTrainingSeedButton } from "@/components/ai-training-seed-button";

export const dynamic = "force-dynamic";

export default async function AiTrainingStudioPage() {
  await requireUser(["ADMIN"]);
  if (process.env.ENABLE_AI_TRAINING_STUDIO !== "true") {
    return (
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-brand-600">AI nội bộ</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">AI Training Studio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Khu vực này đang khóa an toàn. Bật `ENABLE_AI_TRAINING_STUDIO=true` sau khi database đã có migration và đã chuẩn bị dữ liệu demo.</p>
        </header>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">AI Training Studio chưa được publish vào runtime. Khi mở, nơi đây sẽ quản lý Agent Profile, capability pack, knowledge source, mechanism evidence, prompt version, dataset, evaluation và release gate.</div>
      </div>
    );
  }
  const [agents, datasets, evaluations] = await Promise.all([
    prisma.zAgentProfile.count(),
    prisma.zTrainingDataset.count(),
    prisma.zEvaluationRun.count(),
  ]);
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Bot className="h-5 w-5" /></span>
          <div><p className="text-sm font-medium text-brand-600">AI nội bộ</p><h1 className="mt-1 text-2xl font-bold text-slate-900">AI Training Studio</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Nạp cơ chế, dạy cách hỏi lại, kiểm tra tool choice và publish AI theo release gate. Không feedback nào tự sửa production.</p></div>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><Bot className="h-5 w-5 text-violet-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{agents}</p><p className="text-sm text-slate-500">Agent profiles</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><Database className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{datasets}</p><p className="text-sm text-slate-500">Training datasets</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><FlaskConical className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{evaluations}</p><p className="text-sm text-slate-500">Evaluation runs</p></div>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="font-semibold text-emerald-900">Release gate đang bật</p><p className="mt-1 text-sm leading-6 text-emerald-800">Chỉ profile có dataset đã duyệt, test quyền nhạy cảm đạt và kế hoạch rollback mới được publish.</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="font-semibold text-slate-900">Môi trường kiểm thử</p><p className="mt-1 text-sm leading-6 text-slate-500">Tạo profile và dataset demo gồm các case A/B/C/D, cảnh báo y tế, chấm dứt nhân sự và chặn vượt quyền. Không có dữ liệu thật.</p><div className="mt-3"><AiTrainingSeedButton /></div></div>
    </div>
  );
}
