import { describe, expect, it } from "vitest";
import { MemoryAttachmentFileStore, canReadInboxAttachment, validateAndStoreAttachment } from "../attachments";

const input = { channelAccountId: "account-1", originalName: "photo.jpg" };

describe("validateAndStoreAttachment", () => {
  it("rejects an executable named image.jpg", async () => {
    const response = new Response(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), { headers: { "content-type": "image/jpeg" } });
    const store = new MemoryAttachmentFileStore();
    await expect(validateAndStoreAttachment(response, input, store)).rejects.toThrow("Loại tệp không được hỗ trợ");
    expect(store.files).toHaveLength(0);
  });

  it("rejects files larger than 10 MiB", async () => {
    const response = new Response(new Uint8Array(10 * 1024 * 1024 + 1), { headers: { "content-type": "image/png" } });
    await expect(validateAndStoreAttachment(response, { ...input, originalName: "large.png" }, new MemoryAttachmentFileStore())).rejects.toThrow("10 MiB");
  });

  it("uses a generated path for traversal names and accepts real JPEG/PDF magic", async () => {
    const store = new MemoryAttachmentFileStore();
    const jpeg = await validateAndStoreAttachment(new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]), { headers: { "content-type": "image/jpeg" } }), { ...input, originalName: "../../evil.jpg" }, store);
    const pdf = await validateAndStoreAttachment(new Response(new TextEncoder().encode("%PDF-1.7 test"), { headers: { "content-type": "application/pdf" } }), { ...input, originalName: "file.pdf" }, store);
    expect(jpeg.storagePath).toMatch(/^account-1\/[a-f0-9-]+\.jpg$/);
    expect(jpeg.storagePath).not.toContain("..");
    expect(pdf.storagePath).toMatch(/\.pdf$/);
    expect(store.files).toHaveLength(2);
  });
});

describe("attachment authorization", () => {
  it("hard-denies shareholder and scopes CARE to visible conversations", () => {
    expect(canReadInboxAttachment({ id: "s1", role: "SHAREHOLDER" }, { assigneeId: null })).toBe(false);
    expect(canReadInboxAttachment({ id: "u1", role: "CARE" }, { assigneeId: "u1" })).toBe(true);
    expect(canReadInboxAttachment({ id: "u1", role: "CARE" }, { assigneeId: "u2" })).toBe(false);
    expect(canReadInboxAttachment({ id: "m1", role: "MANAGER" }, { assigneeId: "u2" })).toBe(true);
  });
});
