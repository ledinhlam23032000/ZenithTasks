import { format } from "date-fns";
import { GENDER_LABEL } from "@/lib/status";

export const CONSULTATION_DOCUMENT_TITLE = "Hồ sơ dịch vụ thẩm mỹ";
export const CONSULTATION_DOCUMENT_TITLE_UPPER = "HỒ SƠ DỊCH VỤ THẨM MỸ";

export const CONSULTATION_SCREENING_ITEMS = [
  { key: "Huyết áp", label: "Cao huyết áp hoặc huyết áp thấp" },
  { key: "Tim mạch", label: "Các bệnh về tim mạch (hở van tim, rối loạn nhịp tim...)" },
  { key: "Tiểu đường", label: "Bệnh tiểu đường" },
  { key: "Hô hấp", label: "Bệnh hô hấp (Hen suyễn, viêm phế quản, lao phổi...)" },
  { key: "Bệnh truyền nhiễm", label: "Các bệnh truyền nhiễm (Viêm gan B/C, HIV/AIDS, Giang mai...)" },
  { key: "Tuyến giáp", label: "Bệnh lý tuyến giáp (Cường giáp, suy giáp...)" },
  { key: "Máu khó đông", label: "Máu khó đông, chảy máu kéo dài khi bị thương" },
  { key: "Dị ứng thuốc", label: "Dị ứng thuốc (kháng sinh, thuốc tê, thuốc mê...)" },
  { key: "Dị ứng thức ăn/cao su", label: "Dị ứng thức ăn, hải sản, cao su hoặc hóa chất khác" },
  { key: "Thuốc chống đông", label: "Đang sử dụng thuốc chống đông máu (Aspirin, Warfarin...)" },
  { key: "Thuốc nam/bắc/TPCN", label: "Đang uống thuốc nam, thuốc bắc, hoặc thực phẩm chức năng" },
  { key: "Thuốc lá/rượu bia", label: "Có hút thuốc lá, sử dụng rượu bia thường xuyên" },
  { key: "Chất kích thích", label: "Sử dụng chất kích thích (ma túy, cần sa...)" },
  { key: "Phẫu thuật trước đây", label: "Đã từng phẫu thuật hoặc can thiệp y tế trước đây?" },
  { key: "Biến chứng gây tê/gây mê", label: "Từng có biến chứng khi gây tê / gây mê trước đây?" },
  { key: "Mang thai", label: "Đang mang thai hoặc nghi ngờ mang thai?" },
  { key: "Cho con bú", label: "Đang trong thời kỳ cho con bú?" },
  { key: "Kỳ kinh nguyệt", label: "Đang trong kỳ kinh nguyệt?" },
] as const;

export type ScreeningEntry = { abnormal: boolean; note: string };
export type ScreeningMap = Record<string, ScreeningEntry>;

export function defaultScreening(): ScreeningMap {
  return Object.fromEntries(CONSULTATION_SCREENING_ITEMS.map(({ key }) => [key, { abnormal: false, note: "" }])) as ScreeningMap;
}

export function normalizeScreening(value: unknown): ScreeningMap {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = defaultScreening();
  for (const { key } of CONSULTATION_SCREENING_ITEMS) {
    const raw = source[key];
    if (typeof raw === "boolean") {
      result[key] = { abnormal: raw, note: "" };
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const entry = raw as Record<string, unknown>;
      result[key] = { abnormal: entry.abnormal === true, note: typeof entry.note === "string" ? entry.note : "" };
    }
  }
  return result;
}

type PrintOverrides = {
  fullName?: string;
  address?: string;
  phoneLast5?: string;
  wants?: string;
  currentCondition?: string;
  expectedResult?: string;
  doctorIndication?: string;
  extraNote?: string;
};

type ConsultationPrintRecord = {
  code: string;
  createdAt: Date;
  customer: { fullName: string; code: string; phoneLast5: string; gender: string | null; dob: Date | null; address: string | null };
  consultation: {
    weightKg: unknown;
    heightCm: unknown;
    bloodType: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    pulse: number | null;
    bloodPressure: string | null;
    temperatureC: unknown;
    respiratoryRate: number | null;
    spo2: number | null;
    screening: unknown;
    patientConfirmed: boolean;
    wants: string | null;
    currentCondition: string | null;
    expectedResult: string | null;
    doctorIndication: string | null;
    serviceSnapshot: unknown;
    printOverrides: unknown;
  } | null;
  consultant: { fullName: string } | null;
  doctor: { fullName: string } | null;
  services: Array<{ name: string; quantity: number; finalPrice: unknown }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function numberText(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? new Intl.NumberFormat("vi-VN").format(n) : "";
}

function ageAt(dob: Date | null, at: Date): string {
  if (!dob) return "";
  const years = at.getFullYear() - dob.getFullYear() - ((at.getMonth() < dob.getMonth() || (at.getMonth() === dob.getMonth() && at.getDate() < dob.getDate())) ? 1 : 0);
  return years >= 0 ? String(years) : "";
}

export type ConsultationPrintDocument = {
  code: string;
  filledAt: Date;
  fullName: string;
  customerCode: string;
  gender: string;
  dob: string;
  age: string;
  address: string;
  phoneLast5: string;
  weightKg: string;
  heightCm: string;
  bloodType: string;
  emergencyName: string;
  emergencyPhone: string;
  pulse: string;
  bloodPressure: string;
  temperatureC: string;
  respiratoryRate: string;
  spo2: string;
  screening: Array<{ label: string; abnormal: boolean; note: string }>;
  wants: string;
  currentCondition: string;
  expectedResult: string;
  doctorIndication: string;
  extraNote: string;
  patientConfirmed: boolean;
  consultantName: string;
  doctorName: string;
  services: Array<{ name: string; quantity: number; amount: string }>;
};

export function consultationPrintDocument(item: ConsultationPrintRecord): ConsultationPrintDocument {
  const c = item.consultation;
  const overrides = asRecord(c?.printOverrides) as PrintOverrides;
  const override = (key: keyof PrintOverrides, fallback: string) => text(overrides[key]) || fallback;
  const filledAt = item.createdAt;
  const sourceScreening = normalizeScreening(c?.screening);
  const serviceSnapshot = asRecord(c?.serviceSnapshot);
  const initialInterest = text(serviceSnapshot.initialInterest);
  const services = item.services.length > 0 ? item.services : (initialInterest ? [{ name: initialInterest, quantity: 1, finalPrice: 0 }] : []);
  return {
    code: item.code,
    filledAt,
    fullName: override("fullName", item.customer.fullName),
    customerCode: item.customer.code,
    gender: item.customer.gender ? GENDER_LABEL[item.customer.gender as keyof typeof GENDER_LABEL] ?? item.customer.gender : "",
    dob: item.customer.dob ? format(item.customer.dob, "dd/MM/yyyy") : "",
    age: ageAt(item.customer.dob, filledAt),
    address: override("address", item.customer.address ?? ""),
    phoneLast5: override("phoneLast5", item.customer.phoneLast5),
    weightKg: numberText(c?.weightKg),
    heightCm: numberText(c?.heightCm),
    bloodType: text(c?.bloodType),
    emergencyName: text(c?.emergencyName),
    emergencyPhone: text(c?.emergencyPhone),
    pulse: numberText(c?.pulse),
    bloodPressure: text(c?.bloodPressure),
    temperatureC: numberText(c?.temperatureC),
    respiratoryRate: numberText(c?.respiratoryRate),
    spo2: numberText(c?.spo2),
    screening: CONSULTATION_SCREENING_ITEMS.map(({ key, label }) => ({ label, ...sourceScreening[key] })),
    wants: override("wants", c?.wants ?? ""),
    currentCondition: override("currentCondition", c?.currentCondition ?? ""),
    expectedResult: override("expectedResult", c?.expectedResult ?? ""),
    doctorIndication: override("doctorIndication", c?.doctorIndication ?? ""),
    extraNote: override("extraNote", ""),
    patientConfirmed: c?.patientConfirmed ?? false,
    consultantName: item.consultant?.fullName ?? "",
    doctorName: item.doctor?.fullName ?? "",
    services: services.map((service) => ({ name: service.name, quantity: service.quantity, amount: numberText(service.finalPrice) })),
  };
}

export const CONSULTATION_PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef2f7; color: #111827; font-family: "Times New Roman", Times, serif; }
  .consultation-paper { width: 100%; max-width: 794px; margin: 0 auto; padding: 24px 28px 30px; background: #fff; }
  .consultation-paper h1, .consultation-paper h2 { text-align: center; margin: 0; }
  .consultation-paper h1 { font-size: 20px; line-height: 1.3; }
  .consultation-paper h2 { margin-top: 22px; margin-bottom: 8px; font-size: 16px; text-transform: uppercase; }
  .consultation-meta { text-align: center; color: #475569; font-size: 11px; margin: 4px 0 18px; }
  .consultation-table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; page-break-inside: avoid; }
  .consultation-table th, .consultation-table td { border: 1px solid #64748b; padding: 5px 6px; vertical-align: top; font-size: 11px; line-height: 1.3; }
  .consultation-table th { background: #f1f5f9; text-align: center; font-weight: 700; }
  .consultation-table .center { text-align: center; }
  .consultation-table .narrow { width: 34px; }
  .consultation-table .note { min-width: 150px; }
  .consultation-lines { white-space: pre-wrap; min-height: 46px; padding: 4px; }
  .consultation-signatures { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 30px; page-break-inside: avoid; }
  .consultation-signatures td { width: 33.33%; text-align: center; vertical-align: top; font-size: 12px; font-weight: 700; padding: 0 6px; }
  .consultation-signatures .hint { display: block; margin-top: 6px; font-weight: 400; }
  .consultation-signatures .blank { display: block; min-height: 70px; }
  .consultation-screen-actions { max-width: 794px; margin: 16px auto; display: flex; justify-content: flex-end; gap: 8px; font-family: system-ui, sans-serif; }
  @media print { body { background: #fff; } .consultation-screen-actions { display: none !important; } .consultation-paper { max-width: none; padding: 0; } }
`;

export function renderConsultationPaper(document: ConsultationPrintDocument): string {
  const dateText = format(document.filledAt, "dd/MM/yyyy");
  const screeningRows = document.screening.map((item, index) => `<tr><td class="center">${index + 1}</td><td>${escapeHtml(item.label)}</td><td class="center">${item.abnormal ? "☑" : "☐"}</td><td class="center">${item.abnormal ? "☐" : "☑"}</td><td class="note">${escapeHtml(item.note)}</td></tr>`).join("");
  const serviceRows = document.services.length > 0
    ? document.services.map((service) => `<tr><td>${escapeHtml(service.name)}</td><td class="center">${service.quantity}</td><td class="center">${escapeHtml(service.amount ? `${service.amount} đồng` : "")}</td><td></td></tr>`).join("")
    : `<tr><td colspan="4" class="center">Chưa đăng ký dịch vụ</td></tr>`;
  const field = (label: string, value: string) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`;
  return `<section class="consultation-paper">
    <h1>${CONSULTATION_DOCUMENT_TITLE_UPPER}</h1>
    <p class="consultation-meta">Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc · Hồ sơ ${escapeHtml(document.code)} · Ngày ${escapeHtml(dateText)}</p>
    <h2>I. Thông tin hành chính</h2>
    <table class="consultation-table"><tbody>
      <tr><td colspan="2">${field("Họ và tên", document.fullName)}</td><td>${field("Giới tính", document.gender)}</td><td>${field("Mã KH", document.customerCode)}</td></tr>
      <tr><td colspan="2">${field("Ngày sinh", document.dob)} ${document.age ? `· ${escapeHtml(document.age)} tuổi` : ""}</td><td colspan="2">${field("SĐT (5 số cuối)", document.phoneLast5)}</td></tr>
      <tr><td colspan="4">${field("Địa chỉ", document.address)}</td></tr>
      <tr><td colspan="2">${field("Cân nặng", document.weightKg ? `${document.weightKg} kg` : "")}</td><td>${field("Chiều cao", document.heightCm ? `${document.heightCm} cm` : "")}</td><td>${field("Nhóm máu", document.bloodType)}</td></tr>
      <tr><td colspan="4">${field("Người liên hệ khi cần", `${document.emergencyName}${document.emergencyPhone ? ` · ${document.emergencyPhone}` : ""}`)}</td></tr>
    </tbody></table>
    <h2>II. Dấu hiệu sinh tồn</h2>
    <table class="consultation-table"><tbody><tr><td>${field("Mạch", document.pulse ? `${document.pulse} lần/phút` : "")}</td><td>${field("Huyết áp", document.bloodPressure)}</td><td>${field("Nhiệt độ", document.temperatureC ? `${document.temperatureC} °C` : "")}</td><td>${field("Nhịp thở", document.respiratoryRate ? `${document.respiratoryRate} lần/phút` : "")}</td><td>${field("SpO2", document.spo2 ? `${document.spo2} %` : "")}</td></tr></tbody></table>
    <h2>III. Bảng câu hỏi sàng lọc y tế</h2>
    <table class="consultation-table"><thead><tr><th class="narrow">STT</th><th>Bạn có đang mắc hoặc từng mắc vấn đề sau không?</th><th class="narrow">Có</th><th class="narrow">Không</th><th class="note">Ghi chú</th></tr></thead><tbody>${screeningRows}</tbody></table>
    <h2>IV. Nội dung tư vấn</h2>
    <table class="consultation-table"><thead><tr><th>Hạng mục</th><th>Nội dung</th></tr></thead><tbody>
      <tr><td>Mong muốn của khách</td><td><div class="consultation-lines">${escapeHtml(document.wants)}</div></td></tr>
      <tr><td>Tình trạng hiện tại</td><td><div class="consultation-lines">${escapeHtml(document.currentCondition)}</div></td></tr>
      <tr><td>Kết quả dự tính</td><td><div class="consultation-lines">${escapeHtml(document.expectedResult)}</div></td></tr>
      <tr><td>Chỉ định của bác sĩ</td><td><div class="consultation-lines">${escapeHtml(document.doctorIndication)}</div></td></tr>
      <tr><td>Ghi chú bổ sung</td><td><div class="consultation-lines">${escapeHtml(document.extraNote)}</div></td></tr>
    </tbody></table>
    <h2>V. Phiếu đăng ký dịch vụ</h2>
    <table class="consultation-table"><thead><tr><th>Dịch vụ đăng ký</th><th class="narrow">SL</th><th>Giá tiền</th><th class="narrow">Xác nhận KH</th></tr></thead><tbody>${serviceRows}</tbody></table>
    <h2>VI. Cam kết chấp nhận thủ thuật / phẫu thuật</h2>
    <p style="font-size:12px;line-height:1.5">Tôi là <strong>${escapeHtml(document.fullName)}</strong>, ${escapeHtml(document.age ? `${document.age} tuổi` : "")} ${escapeHtml(document.gender)}; SĐT: ${escapeHtml(document.phoneLast5)}; địa chỉ: ${escapeHtml(document.address)}. Tôi xác nhận đang được tư vấn dịch vụ: <strong>${escapeHtml(document.services.map((service) => service.name).join(", "))}</strong>.</p>
    <p style="font-size:12px;line-height:1.5">Tôi cam đoan các thông tin cung cấp là đúng sự thật và đã được giải thích về tình trạng, kết quả dự tính, chỉ định và các rủi ro liên quan đến dịch vụ. Tôi tự nguyện sử dụng dịch vụ và sẽ tuân thủ hướng dẫn của bác sĩ. Xác nhận khách hàng: <strong>${document.patientConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}</strong>.</p>
    <table class="consultation-signatures"><tbody><tr><td>Người tư vấn<span class="hint">${escapeHtml(document.consultantName)}</span><span class="blank"></span><span class="hint">(Ký, ghi rõ họ tên)</span></td><td>Bác sĩ<span class="hint">${escapeHtml(document.doctorName)}</span><span class="blank"></span><span class="hint">(Ký, ghi rõ họ tên)</span></td><td>Khách hàng / đại diện<span class="blank"></span><span class="hint">(Ký, ghi rõ họ tên)</span></td></tr></tbody></table>
  </section>`;
}

export function renderConsultationHtml(document: ConsultationPrintDocument, includeActions = false): string {
  const actions = includeActions ? `<div class="consultation-screen-actions"><button onclick="window.print()">In / Lưu PDF</button></div>` : "";
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${CONSULTATION_DOCUMENT_TITLE} ${escapeHtml(document.code)}</title><style>${CONSULTATION_PRINT_CSS}.consultation-screen-actions button{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:8px 12px;cursor:pointer}</style></head><body>${actions}${renderConsultationPaper(document)}</body></html>`;
}
