import { type V2ModuleKey, V2_MODULES } from "./v2-modules";
import { type ProjectType } from "./v2-project-types";

export type ProjectTemplateId = "CLINIC" | "SALES_TEAM" | "SERVICE_COMPANY" | "INVESTMENT_PROJECT" | "BLANK";

export type ProjectTemplate = {
  id: ProjectTemplateId;
  name: string;
  badge: string;
  description: string;
  defaultProjectType: ProjectType;
  defaultModules: V2ModuleKey[];
  recommendedPositions: { code: string; title: string }[];
  suggestedAiName: string;
  suggestedAiPrompt: string;
};

export const PROJECT_TEMPLATES: readonly ProjectTemplate[] = [
  {
    id: "CLINIC",
    name: "Trung tâm Y tế / Thẩm mỹ",
    badge: "Y tế & Chăm sóc",
    description: "Đầy đủ module tiếp nhận khách hàng, lịch hẹn, hồ sơ dịch vụ, thu-chi, nhân sự chuyên môn và AI hỗ trợ lâm sàng.",
    defaultProjectType: "SERVICE",
    defaultModules: ["customers", "appointments", "sales", "finance", "tasks", "organization", "mechanism", "simulation"],
    recommendedPositions: [
      { code: "BAC_SI", title: "Bác sĩ chuyên khoa" },
      { code: "DIEU_DUONG", title: "Điều dưỡng / Kỹ thuật viên" },
      { code: "LE_TAN", title: "Lễ tân tiếp đón" },
      { code: "TU_VAN", title: "Tư vấn viên" },
    ],
    suggestedAiName: "Trợ lý Y tế & Vận hành",
    suggestedAiPrompt: "Bạn là AI đồng nghiệp số chuyên trách hỗ trợ theo dõi lịch hẹn, nhắc nhở khách hàng và tổng hợp ca dịch vụ.",
  },
  {
    id: "SALES_TEAM",
    name: "Đội nhóm Kinh doanh / Sales",
    badge: "Thương mại & Bán hàng",
    description: "Tập trung tối đa vào phễu khách hàng, theo dõi doanh số, cơ chế hoa hồng, phân bổ chỉ tiêu và task đôn đốc bán hàng.",
    defaultProjectType: "DISTRIBUTION",
    defaultModules: ["customers", "sales", "finance", "tasks", "mechanism", "simulation"],
    recommendedPositions: [
      { code: "SALES_LEAD", title: "Trưởng nhóm Kinh doanh" },
      { code: "SALES_EXEC", title: "Chuyên viên Sales" },
      { code: "CTV_PARTNER", title: "Cộng tác viên / Đối tác" },
    ],
    suggestedAiName: "Trợ lý Kinh doanh & KPI",
    suggestedAiPrompt: "Bạn là AI trợ lý kinh doanh hỗ trợ đôn đốc chỉ tiêu, phân tích chuyển đổi khách hàng và tổng hợp doanh thu.",
  },
  {
    id: "SERVICE_COMPANY",
    name: "Công ty Dịch vụ & CSKH",
    badge: "Dịch vụ khách hàng",
    description: "Quản trị chu trình dịch vụ khách hàng, đặt lịch hẹn, giao việc nội bộ và theo dõi dòng tiền thu chi rõ ràng.",
    defaultProjectType: "SERVICE",
    defaultModules: ["customers", "appointments", "sales", "finance", "tasks", "organization"],
    recommendedPositions: [
      { code: "SERVICE_MGR", title: "Quản lý Dịch vụ" },
      { code: "CSKH_STAFF", title: "Chuyên viên Chăm sóc Khách hàng" },
      { code: "ACC_STAFF", title: "Kế toán / Thu ngân" },
    ],
    suggestedAiName: "Trợ lý Dịch vụ Khách hàng",
    suggestedAiPrompt: "Bạn là AI hỗ trợ quản trị chất lượng dịch vụ, nhắc hẹn chăm sóc và kiểm tra sự hài lòng của khách.",
  },
  {
    id: "INVESTMENT_PROJECT",
    name: "Dự án Đầu tư / Hợp tác",
    badge: "Đầu tư & Vốn",
    description: "Mô hình tinh gọn chuyên quản lý tiến độ công việc, sổ cái thu chi minh bạch và cơ chế phân chia lợi nhuận giữa các đối tác.",
    defaultProjectType: "PARTNERSHIP",
    defaultModules: ["finance", "tasks", "organization", "mechanism"],

    recommendedPositions: [
      { code: "CO_DONG", title: "Cổ đông / Nhà đầu tư" },
      { code: "GIAM_SAT", title: "Ban kiểm soát dự án" },
      { code: "THU_KY", title: "Thư ký điều hành" },
    ],
    suggestedAiName: "Trợ lý Tài chính & Báo cáo Đầu tư",
    suggestedAiPrompt: "Bạn là AI hỗ trợ tổng hợp dòng tiền đầu tư, theo dõi tiến độ các cột mốc dự án và cảnh báo sai lệch tài chính.",
  },
  {
    id: "BLANK",
    name: "Dự án Tùy chỉnh (Blank)",
    badge: "Linh hoạt 100%",
    description: "Bắt đầu từ một trang trắng hoàn toàn, tự do lựa chọn các module Lego bạn cần theo mô hình tổ chức riêng biệt.",
    defaultProjectType: "OTHER",
    defaultModules: ["tasks", "organization"],
    recommendedPositions: [
      { code: "LEAD", title: "Trưởng đơn vị" },
      { code: "MEMBER", title: "Thành viên dự án" },
    ],
    suggestedAiName: "Trợ lý Điều hành Dự án",
    suggestedAiPrompt: "Bạn là AI đồng nghiệp số hỗ trợ quản trị và theo dõi tiến độ công việc trong dự án.",
  },
] as const;

export function getProjectTemplate(id: string): ProjectTemplate {
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? PROJECT_TEMPLATES[PROJECT_TEMPLATES.length - 1];
}
