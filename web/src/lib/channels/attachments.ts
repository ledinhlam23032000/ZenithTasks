import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { decryptChannelSecret } from "./crypto";
import type { Role } from "@/generated/prisma/client";

export const MAX_INBOX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const INBOX_ATTACHMENT_ROOT = process.env.INBOX_ATTACHMENT_ROOT ?? "/app/private/inbox";

type SupportedFile = { mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; extension: "jpg" | "png" | "webp" | "pdf" };

export interface AttachmentFileStore {
  write(relativePath: string, data: Uint8Array): Promise<void>;
  read?(relativePath: string): Promise<Uint8Array>;
}

export type StoredAttachment = { storagePath: string; mimeType: SupportedFile["mimeType"]; sizeBytes: number };

function detectedFile(bytes: Uint8Array): SupportedFile | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mimeType: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return { mimeType: "image/png", extension: "png" };
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return { mimeType: "image/webp", extension: "webp" };
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return { mimeType: "application/pdf", extension: "pdf" };
  return null;
}

export async function validateAndStoreAttachment(
  response: Response,
  input: { channelAccountId: string; originalName: string },
  store: AttachmentFileStore = diskAttachmentStore,
): Promise<StoredAttachment> {
  if (!/^[A-Za-z0-9_-]+$/.test(input.channelAccountId)) throw new Error("Mã tài khoản kênh không hợp lệ.");
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_INBOX_ATTACHMENT_BYTES) throw new Error("Tệp đính kèm không được vượt quá 10 MiB.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_INBOX_ATTACHMENT_BYTES) throw new Error("Tệp đính kèm không được vượt quá 10 MiB.");
  const detected = detectedFile(bytes);
  const declared = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!detected || declared !== detected.mimeType) throw new Error("Loại tệp không được hỗ trợ hoặc nội dung tệp không khớp.");
  const storagePath = `${input.channelAccountId}/${randomUUID()}.${detected.extension}`;
  await store.write(storagePath, bytes);
  return { storagePath, mimeType: detected.mimeType, sizeBytes: bytes.byteLength };
}

export function canReadInboxAttachment(
  user: { id: string; role: Role; permissions?: unknown },
  conversation: { assigneeId: string | null },
): boolean {
  if (!userCan(user, "inbox.view")) return false;
  return userCan(user, "inbox.viewAll") || conversation.assigneeId === null || conversation.assigneeId === user.id;
}

export const diskAttachmentStore: AttachmentFileStore = {
  async write(relativePath, data) {
    const target = path.resolve(/* turbopackIgnore: true */ INBOX_ATTACHMENT_ROOT, relativePath);
    const root = path.resolve(/* turbopackIgnore: true */ INBOX_ATTACHMENT_ROOT) + path.sep;
    if (!target.startsWith(root)) throw new Error("Đường dẫn tệp không hợp lệ.");
    await mkdir(/* turbopackIgnore: true */ path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(/* turbopackIgnore: true */ target, data, { flag: "wx", mode: 0o600 });
  },
  async read(relativePath) {
    const target = path.resolve(/* turbopackIgnore: true */ INBOX_ATTACHMENT_ROOT, relativePath);
    const root = path.resolve(/* turbopackIgnore: true */ INBOX_ATTACHMENT_ROOT) + path.sep;
    if (!target.startsWith(root)) throw new Error("Đường dẫn tệp không hợp lệ.");
    return new Uint8Array(await readFile(/* turbopackIgnore: true */ target));
  },
};

export class MemoryAttachmentFileStore implements AttachmentFileStore {
  readonly files: { path: string; data: Uint8Array }[] = [];
  async write(relativePath: string, data: Uint8Array) { this.files.push({ path: relativePath, data: new Uint8Array(data) }); }
  async read(relativePath: string) {
    const file = this.files.find((item) => item.path === relativePath);
    if (!file) throw new Error("Không tìm thấy tệp.");
    return new Uint8Array(file.data);
  }
}

export async function downloadPendingInboxAttachments(limit = 25): Promise<{ ready: number; failed: number }> {
  const pending = await prisma.inboxAttachment.findMany({ where: { status: "PENDING", providerUrlEnc: { not: null } }, orderBy: { createdAt: "asc" }, take: limit });
  let ready = 0;
  let failed = 0;
  for (const attachment of pending) {
    try {
      const response = await fetch(decryptChannelSecret(attachment.providerUrlEnc!), { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("Provider attachment unavailable");
      const stored = await validateAndStoreAttachment(response, { channelAccountId: attachment.channelAccountId, originalName: attachment.originalName ?? "provider-file" });
      await prisma.inboxAttachment.update({ where: { id: attachment.id }, data: { ...stored, providerUrlEnc: null, status: "READY", errorMessage: null } });
      ready += 1;
    } catch {
      await prisma.inboxAttachment.update({ where: { id: attachment.id }, data: { status: "FAILED", providerUrlEnc: null, errorMessage: "Không tải được tệp từ nhà cung cấp." } });
      failed += 1;
    }
  }
  return { ready, failed };
}
