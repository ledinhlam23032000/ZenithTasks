"use client";

import { useState, useTransition } from "react";
import {
  FolderPlus,
  Sparkles,
  CheckCircle2,
  Building2,
  Stethoscope,
  TrendingUp,
  Briefcase,
  Layers,
  Bot,
  Shield,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PROJECT_TEMPLATES, type ProjectTemplateId } from "@/lib/v2-project-templates";
import { V2_MODULES, type V2ModuleKey } from "@/lib/v2-modules";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, type ProjectType } from "@/lib/v2-project-types";
import { createV2ProjectAction } from "@/lib/v2-project-actions";

type Props = {
  users?: { id: string; fullName: string | null; username: string; role: string }[];
};

export function V2CreateProjectWizard({ users = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<ProjectTemplateId>("CLINIC");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("SERVICE");
  const [selectedModules, setSelectedModules] = useState<V2ModuleKey[]>([
    "customers",
    "appointments",
    "sales",
    "finance",
    "tasks",
    "organization",
    "mechanism",
    "simulation",
  ]);
  const [adminUserId, setAdminUserId] = useState<string>("");
  const [aiName, setAiName] = useState("Trợ lý Y tế & Vận hành");
  const [aiPrompt, setAiPrompt] = useState(
    "Bạn là AI đồng nghiệp số chuyên trách hỗ trợ theo dõi lịch hẹn, nhắc nhở khách hàng và tổng hợp ca dịch vụ."
  );

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Chọn template -> tự động điền các thông số mặc định
  const handleSelectTemplate = (templateId: ProjectTemplateId) => {
    setSelectedTemplateId(templateId);
    const t = PROJECT_TEMPLATES.find((item) => item.id === templateId);
    if (t) {
      setProjectType(t.defaultProjectType);
      setSelectedModules([...t.defaultModules]);
      setAiName(t.suggestedAiName);
      setAiPrompt(t.suggestedAiPrompt);
    }
  };

  const toggleModule = (moduleKey: V2ModuleKey) => {
    if (selectedModules.includes(moduleKey)) {
      setSelectedModules(selectedModules.filter((m) => m !== moduleKey));
    } else {
      setSelectedModules([...selectedModules, moduleKey]);
    }
  };

  const handleAutoCode = (inputName: string) => {
    setName(inputName);
    if (!code || code.startsWith("DN-")) {
      const slug = inputName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toUpperCase()
        .replace(/-+/g, "-")
        .slice(0, 24);
      if (slug) setCode(`DN-${slug}`);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.set("code", code);
    formData.set("name", name);
    formData.set("description", description);
    formData.set("projectType", projectType);
    formData.set("initialStatus", "ACTIVE");
    if (adminUserId) formData.set("adminUserId", adminUserId);
    formData.set("aiName", aiName);
    formData.set("aiPrompt", aiPrompt);
    selectedModules.forEach((m) => formData.append("modules", m));

    startTransition(async () => {
      const res = await createV2ProjectAction({}, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage(res.message ?? "Tạo đơn vị thành công!");
        setTimeout(() => {
          setIsOpen(false);
          router.refresh();
        }, 1200);
      }
    });
  };

  const templateIcons = {
    CLINIC: <Stethoscope className="h-6 w-6 text-emerald-600" />,
    SALES_TEAM: <TrendingUp className="h-6 w-6 text-blue-600" />,
    SERVICE_COMPANY: <Briefcase className="h-6 w-6 text-violet-600" />,
    INVESTMENT_PROJECT: <Building2 className="h-6 w-6 text-amber-600" />,
    BLANK: <Layers className="h-6 w-6 text-slate-600" />,
  };

  if (!isOpen) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/40 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Mở Rộng Hệ Sinh Thái Đa Đơn Vị</h3>
            <p className="text-sm text-slate-600">
              Tạo mới công ty, chi nhánh, phòng khám hoặc dự án vận hành độc lập chỉ trong vài bước với Lego Modules.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-violet-700 transition"
        >
          <FolderPlus className="h-4 w-4" /> + Tạo đơn vị mới
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-lg">
      {/* Header & Steps Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
            <Sparkles className="h-3.5 w-3.5" /> Wizard Khởi Tạo Đơn Vị AI-Native
          </span>
          <h2 className="mt-1.5 text-xl font-bold text-slate-900">Thiết lập đơn vị mới</h2>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                  step === s
                    ? "bg-violet-600 text-white ring-2 ring-violet-200"
                    : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 5 && <div className="h-0.5 w-4 bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Contents */}
      <div className="mt-6">
        {/* STEP 1: CHỌN TEMPLATE */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Bước 1: Chọn mẫu định hình (Preset Template)</h3>
              <p className="text-sm text-slate-500">
                Template giúp bạn kích hoạt nhanh bộ module và AI phù hợp. Bạn hoàn toàn có thể tùy biến ở các bước sau.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROJECT_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-violet-600 bg-violet-50/50 ring-2 ring-violet-200 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl bg-slate-100 p-2.5">{templateIcons[tpl.id]}</div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {tpl.badge}
                      </span>
                    </div>
                    <h4 className="mt-3 font-bold text-slate-900">{tpl.name}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{tpl.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tpl.defaultModules.slice(0, 4).map((m) => (
                        <span key={m} className="rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-slate-600 border border-slate-200">
                          {V2_MODULES.find((mod) => mod.key === m)?.label ?? m}
                        </span>
                      ))}
                      {tpl.defaultModules.length > 4 && (
                        <span className="rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-slate-500 border border-slate-200">
                          +{tpl.defaultModules.length - 4} khác
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: THÔNG TIN CƠ BẢN */}
        {step === 2 && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Bước 2: Thông tin định danh đơn vị</h3>
              <p className="text-sm text-slate-500">Mã đơn vị là duy nhất trên toàn hệ thống và dùng để phân tầng dữ liệu.</p>
            </div>
            <div className="space-y-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Tên Đơn Vị / Công Ty / Dự Án *
                <input
                  value={name}
                  onChange={(e) => handleAutoCode(e.target.value)}
                  placeholder="VD: Chi Nhánh Thẩm Mỹ Luxury Sài Gòn"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Mã Đơn Vị (Code) *
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                    placeholder="VD: LUXURY-SG"
                    className="rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-sm uppercase outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Phân Loại Mô Hình
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value as ProjectType)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PROJECT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Mô tả phạm vi hoạt động
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngành nghề, mục tiêu vận hành và ranh giới hoạt động của đơn vị này..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: LEGO MODULES SELECTION */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bước 3: Tinh chỉnh Lego Modules</h3>
                <p className="text-sm text-slate-500">
                  Bật các module đơn vị cần dùng. Các tính năng không chọn sẽ tự động ẩn để giữ giao diện tinh gọn.
                </p>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                Đã bật {selectedModules.length} module
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {V2_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      isChecked
                        ? "border-violet-600 bg-violet-50/40 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleModule(mod.key)}
                      className="mt-1 h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <h4 className="font-semibold text-slate-900">{mod.label}</h4>
                      <p className="mt-0.5 text-xs text-slate-500">{mod.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: QUẢN TRỊ VIÊN & AI CON NỘI BỘ */}
        {step === 4 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Bước 4: Quản trị viên & AI Đồng nghiệp số</h3>
              <p className="text-sm text-slate-500">
                Giao quyền Admin cho người phụ trách và khởi tạo trợ lý AI độc lập phục vụ riêng cho đơn vị này.
              </p>
            </div>

            {/* Admin Selector */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-600" />
                <h4 className="font-bold text-slate-900">Chỉ định Quản trị viên đơn vị (Project Admin)</h4>
              </div>
              <p className="text-xs text-slate-500">
                Người này sẽ có toàn quyền cấu hình nhân sự, phê duyệt và quản lý trong đơn vị mới.
              </p>
              <select
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Tự động gán cho tài khoản hiện tại (Super Admin)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* AI Agent Configuration */}
            <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-600" />
                <h4 className="font-bold text-slate-900">AI Trợ Lý Nội Bộ (Child AI Agent)</h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Mọi Đơn vị mới đều có sẵn 1 AI con — anh chỉ cần đặt tên/chỉ dẫn riêng nếu muốn, không cần bật/tắt.
              </p>
              <div className="space-y-3 pt-1">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Tên hiển thị của AI Trợ Lý
                  <input
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    placeholder="VD: Trợ lý Vận hành Chi nhánh"
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Chỉ dẫn hành vi (System Prompt ban đầu)
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={2}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  * AI Con được phân vùng bảo mật tự động: chỉ đọc dữ liệu của đơn vị này và gọi các tool trong Allowlist được cấp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: XEM TRƯỚC VÀ XÁC NHẬN */}
        {step === 5 && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Bước 5: Xem trước Blueprint đơn vị</h3>
              <p className="text-sm text-slate-500">Kiểm tra thông số trước khi hệ thống tạo workspace vận hành thực tế.</p>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Tên đơn vị:</span>
                <span className="font-bold text-slate-900">{name || "Chưa đặt"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Mã định danh:</span>
                <span className="font-mono font-bold text-violet-700">{code || "Chưa đặt"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Mô hình:</span>
                <span className="font-medium text-slate-800">{PROJECT_TYPE_LABELS[projectType]}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Trạng thái khởi tạo:</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  ACTIVE (Vận hành thực)
                </span>
              </div>
              <div className="py-2">
                <span className="text-slate-500">Lego Modules ({selectedModules.length}):</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedModules.map((m) => (
                    <span key={m} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                      {V2_MODULES.find((mod) => mod.key === m)?.label ?? m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">AI Đồng nghiệp số:</span>
                <span className="font-semibold text-violet-700">{aiName} (Đã cấu hình)</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as any)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 2 && (!name || !code)) {
                setError("Vui lòng nhập đầy đủ Tên và Mã đơn vị.");
                return;
              }
              setError(null);
              setStep((s) => (s + 1) as any);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-violet-700"
          >
            Tiếp tục <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending || !name || !code}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isPending ? "Đang khởi tạo đơn vị..." : "Xác nhận & Khởi tạo Đơn Vị"}
          </button>
        )}
      </div>
    </div>
  );
}
