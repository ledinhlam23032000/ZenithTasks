import { z } from "zod";
import { prisma } from "./db";

export const clinicConfigSchema = z.object({
  brandName: z.string().trim().min(1).max(160),
  legalName: z.string().trim().min(1).max(200),
  logoUrl: z.string().trim().max(500).optional().default(""),
  faviconUrl: z.string().trim().max(500).optional().default(""),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#8f1822"),
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#f4b740"),
  hotline: z.string().trim().max(40).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
  address: z.string().trim().max(300).default(""),
  website: z.string().trim().max(300).default(""),
  timezone: z.string().trim().min(1).default("Asia/Ho_Chi_Minh"),
  workingDays: z.string().trim().max(120).default("Thứ 2 – Thứ 7"),
  bookingHours: z.string().trim().max(120).default("08:00 – 17:00"),
  privacyPolicy: z.string().max(5000).default(""),
  portalGreeting: z.string().max(500).default(""),
  serviceCatalog: z.string().max(5000).default(""),
  messageTemplates: z.string().max(5000).default(""),
});

export type ClinicConfig = z.infer<typeof clinicConfigSchema>;

export const DEFAULT_CLINIC_CONFIG: ClinicConfig = {
  brandName: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ",
  legalName: "Bệnh viện Đa khoa Hồng Phúc",
  logoUrl: "",
  faviconUrl: "/icons/icon-192.png",
  primaryColor: "#8f1822",
  secondaryColor: "#f4b740",
  hotline: "0941 567 496",
  email: "benhviendakhoahongphuchaiphong@gmail.com",
  address: "",
  website: "",
  timezone: "Asia/Ho_Chi_Minh",
  workingDays: "Thứ 2 – Thứ 7",
  bookingHours: "08:00 – 17:00",
  privacyPolicy: "",
  portalGreeting: "Cảm ơn Quý khách đã tin tưởng chúng tôi.",
  serviceCatalog: "",
  messageTemplates: "",
};

const KEY = "clinic.config";

function parseValue(value: unknown): Partial<ClinicConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Partial<ClinicConfig>;
}

export async function getClinicConfig(): Promise<ClinicConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY }, select: { value: true } }).catch(() => null);
  const parsed = clinicConfigSchema.partial().safeParse(parseValue(row?.value));
  return { ...DEFAULT_CLINIC_CONFIG, ...(parsed.success ? parsed.data : {}) };
}

export async function saveClinicConfig(input: ClinicConfig): Promise<ClinicConfig> {
  const parsed = clinicConfigSchema.parse(input);
  await prisma.appSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: parsed }, update: { value: parsed } });
  return parsed;
}
