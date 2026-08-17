"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { getUploadDir, getUploadStorageError } from "@/lib/upload-storage";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedMimes = new Set([
  "text/plain", "text/csv", "application/json", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword", "application/vnd.ms-excel",
  "image/jpeg", "image/png", "image/webp",
]);

function extension(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return ext && /^[.][a-z0-9]{1,8}$/.test(ext) ? ext : ".bin";
}

function fileMimeAllowed(file: File): boolean {
  if (allowedMimes.has(file.type)) return true;
  return /\.(txt|csv|json|pdf|docx?|xlsx?|jpe?g|png|webp)$/i.test(file.name);
}

async function extractText(file: File, buffer: Buffer): Promise<string | null> {
  const mime = file.type;
  const name = file.name.toLowerCase();
  if (mime.startsWith("text/") || mime === "application/json" || /\.(txt|csv|json)$/i.test(name)) return (await file.text()).slice(0, 200_000);
  if (mime.includes("word") || name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.slice(0, 200_000);
  }
  if (mime.includes("sheet") || /\.(xlsx?|xls)$/i.test(name)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    return workbook.SheetNames.map((sheetName) => `## ${sheetName}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}`).join("\n\n").slice(0, 200_000);
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const module = await import("pdf-parse");
    const pdfParse = ((module as unknown as { default?: unknown }).default ?? module) as (data: Buffer) => Promise<{ text?: string }>;
    const result = await pdfParse(buffer);
    return (result.text ?? "").slice(0, 200_000);
  }
  return null;
}

export type AssistantFileState = { ok?: boolean; error?: string; file?: { id: string; name: string; extracted: boolean } };

export async function uploadAssistantFile(_prev: AssistantFileState, formData: FormData): Promise<AssistantFileState> {
  const user = await requireCap("mod:tro-ly");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn file." };
  if (file.size > MAX_FILE_SIZE) return { error: "File tối đa 15MB." };
  if (!fileMimeAllowed(file)) return { error: "Chỉ hỗ trợ TXT, CSV, JSON, DOC/DOCX, XLS/XLSX, PDF và ảnh JPG/PNG/WEBP." };
  const storageError = getUploadStorageError();
  if (storageError) return { error: storageError };
  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText: string | null = null;
  try {
    extractedText = await extractText(file, buffer);
  } catch {
    return { error: "File đã nhận nhưng không đọc được nội dung. Anh thử lưu lại file dạng DOCX/XLSX/PDF hoặc TXT rồi tải lại." };
  }
  const storedName = `assistant-${crypto.randomUUID()}${extension(file.name)}`;
  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, storedName);
  await fs.writeFile(target, buffer);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const saved = await tx.assistantFile.create({ data: { uploadedById: user.id, originalName: file.name.slice(0, 200), storedName, mime: file.type || "application/octet-stream", sizeBytes: file.size, extractedText, summary: extractedText ? extractedText.slice(0, 500) : "File hình ảnh hoặc định dạng chưa có trích xuất chữ; cần xem file gốc.", expiresAt: new Date(Date.now() + 30 * 86_400_000) } });
      await auditRequired(tx, user.id, "UPLOAD_ASSISTANT_FILE", { entity: "AssistantFile", entityId: saved.id, meta: { name: file.name, size: file.size, extracted: !!extractedText } });
      return saved;
    });
    return { ok: true, file: { id: created.id, name: created.originalName, extracted: !!created.extractedText } };
  } catch {
    await fs.rm(target, { force: true }).catch(() => {});
    return { error: "Không thể lưu file vào kho AI." };
  }
}

const feedbackSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  originalAnswer: z.string().trim().max(10000).optional(),
  correctedAnswer: z.string().trim().max(10000).optional(),
  note: z.string().trim().max(2000).optional(),
  kind: z.enum(["CORRECTION", "APPROVAL", "REJECTION"]),
});

export async function saveAssistantFeedback(_prev: { ok?: boolean; error?: string }, formData: FormData) {
  const user = await requireCap("mod:tro-ly");
  const parsed = feedbackSchema.safeParse({ prompt: formData.get("prompt"), originalAnswer: formData.get("originalAnswer") || undefined, correctedAnswer: formData.get("correctedAnswer") || undefined, note: formData.get("note") || undefined, kind: formData.get("kind") || "CORRECTION" });
  if (!parsed.success) return { error: "Feedback chưa hợp lệ." };
  const feedback = await prisma.$transaction(async (tx) => {
    const created = await tx.assistantFeedback.create({ data: { userId: user.id, kind: parsed.data.kind, prompt: parsed.data.prompt, originalAnswer: parsed.data.originalAnswer || null, correctedAnswer: parsed.data.correctedAnswer || null, note: parsed.data.note || null, context: { source: "assistant-chat" } } });
    await auditRequired(tx, user.id, "SAVE_ASSISTANT_FEEDBACK", { entity: "AssistantFeedback", entityId: created.id, meta: { kind: parsed.data.kind } });
    return created;
  });
  return { ok: true, id: feedback.id };
}

export async function getAssistantFileContext(userId: string): Promise<string> {
  const [files, feedback] = await Promise.all([
    prisma.assistantFile.findMany({ where: { uploadedById: userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], extractedText: { not: null } }, orderBy: { createdAt: "desc" }, take: 5, select: { originalName: true, extractedText: true } }),
    prisma.assistantFeedback.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { kind: true, prompt: true, correctedAnswer: true, note: true } }),
  ]);
  const fileContext = files.map((file) => `FILE ${file.originalName}:\n${(file.extractedText ?? "").slice(0, 30_000)}`).join("\n\n");
  const feedbackContext = feedback.map((item) => `FEEDBACK ${item.kind}: yêu cầu=${item.prompt}; sửa đúng=${item.correctedAnswer ?? ""}; ghi chú=${item.note ?? ""}`).join("\n");
  return [fileContext && `TÀI LIỆU ADMIN ĐÃ TẢI LÊN:\n${fileContext}`, feedbackContext && `GÓP Ý ĐÃ GHI NHỚ:\n${feedbackContext}`].filter(Boolean).join("\n\n");
}
