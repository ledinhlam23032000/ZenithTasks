import type { Role } from "@/generated/prisma/client";

export type CaseWorkspace = {
  key: "clinical" | "reception" | "finance" | "admin" | "readonly";
  label: string;
  description: string;
  defaultTab: string;
  visibleTabs: readonly string[];
  showFinancialRail: boolean;
};

const ALL_TABS = ["phan-bo-doanh-so", "tu-van", "dich-vu", "vat-tu", "hinh-anh", "giay-to"] as const;
const CLINICAL_TABS = ["tu-van", "dich-vu", "vat-tu", "hinh-anh", "giay-to"] as const;
const FRONT_DESK_TABS = ["dich-vu", "hinh-anh", "giay-to"] as const;
const READONLY_TABS = ["dich-vu", "hinh-anh", "giay-to"] as const;

const WORKSPACES: Record<CaseWorkspace["key"], CaseWorkspace> = {
  admin: {
    key: "admin",
    label: "Toàn cảnh quản trị",
    description: "Đầy đủ giấy tờ, hồ sơ, tài chính và phân bổ doanh số; quyền server-side vẫn là lớp bảo vệ cuối.",
    defaultTab: "giay-to",
    visibleTabs: ALL_TABS,
    showFinancialRail: true,
  },
  clinical: {
    key: "clinical",
    label: "Workspace lâm sàng",
    description: "Ưu tiên Hồ sơ dịch vụ thẩm mỹ, dịch vụ, vật tư và hình ảnh của ca.",
    defaultTab: "giay-to",
    visibleTabs: CLINICAL_TABS,
    showFinancialRail: false,
  },
  reception: {
    key: "reception",
    label: "Workspace lễ tân / thu tiền",
    description: "Ưu tiên dịch vụ, giấy tờ và rail thu tiền; không mở các tab thao tác lâm sàng.",
    defaultTab: "dich-vu",
    visibleTabs: FRONT_DESK_TABS,
    showFinancialRail: true,
  },
  finance: {
    key: "finance",
    label: "Workspace tài chính",
    description: "Ưu tiên phần dịch vụ và đối soát tài chính; không tự mở quyền chỉnh hồ sơ lâm sàng.",
    defaultTab: "dich-vu",
    visibleTabs: FRONT_DESK_TABS,
    showFinancialRail: true,
  },
  readonly: {
    key: "readonly",
    label: "Workspace xem hồ sơ",
    description: "Chỉ hiển thị thông tin cần phối hợp, không mở rail tài chính mặc định.",
    defaultTab: "dich-vu",
    visibleTabs: READONLY_TABS,
    showFinancialRail: false,
  },
};

/**
 * Preset trình bày cho hồ sơ. Đây không phải permission resolver: mọi action
 * vẫn phải đi qua requireCap/userCan ở server và action tương ứng.
 */
export function getCaseWorkspace(role: Role): CaseWorkspace {
  if (role === "ADMIN") return WORKSPACES.admin;
  if (role === "RECEPTION" || role === "TELESALE") return WORKSPACES.reception;
  if (role === "MANAGER") return WORKSPACES.finance;
  if (role === "CONSULTANT" || role === "DOCTOR" || role === "NURSE") return WORKSPACES.clinical;
  return WORKSPACES.readonly;
}
