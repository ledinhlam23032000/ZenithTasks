export type V2ModuleKey = "organization" | "mechanism" | "simulation" | "tasks" | "customers" | "appointments" | "finance" | "payroll";

export type V2ModuleDefinition = {
  key: V2ModuleKey;
  label: string;
  description: string;
  href: (projectId: string) => string;
  available: boolean;
};

export const V2_MODULES: readonly V2ModuleDefinition[] = [
  { key: "organization", label: "Tổ chức & vị trí", description: "Bộ phận, đội nhóm và vị trí của Dự án.", href: (id) => `/du-an/${id}/to-chuc`, available: true },
  { key: "mechanism", label: "Cơ chế", description: "Phiên bản cơ chế, giả định và trạng thái phê duyệt.", href: (id) => `/du-an/${id}/co-che`, available: true },
  { key: "simulation", label: "Mô phỏng", description: "Chạy thử rule-engine trước khi áp dụng.", href: (id) => `/du-an/${id}/co-che`, available: true },
  { key: "tasks", label: "Task & quy trình", description: "Không gian task riêng của Dự án.", href: (id) => `/du-an/${id}/tasks`, available: true },
  { key: "customers", label: "Khách hàng", description: "Hồ sơ khách riêng của Dự án.", href: (id) => `/du-an/${id}/khach-hang`, available: true },
  { key: "appointments", label: "Lịch hẹn", description: "Lịch riêng của Dự án.", href: (id) => `/du-an/${id}?module=appointments`, available: false },
  { key: "finance", label: "Tài chính", description: "Doanh thu và chi phí riêng của Dự án.", href: (id) => `/du-an/${id}?module=finance`, available: false },
  { key: "payroll", label: "Lương & hoa hồng", description: "Settlement riêng của Dự án.", href: (id) => `/du-an/${id}?module=payroll`, available: false },
];

export const V2_DEFAULT_MODULE_KEYS: V2ModuleKey[] = V2_MODULES.filter((module) => module.available).map((module) => module.key);

export function normalizedModuleKeys(raw: unknown): V2ModuleKey[] {
  if (!Array.isArray(raw)) return [...V2_DEFAULT_MODULE_KEYS];
  const allowed = new Set<V2ModuleKey>(V2_MODULES.map((module) => module.key));
  return raw.map(String).filter((key): key is V2ModuleKey => allowed.has(key as V2ModuleKey));
}
