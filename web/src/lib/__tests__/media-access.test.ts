import { describe, expect, it } from "vitest";
import { canAccessMedia, type MediaAccessRecord } from "../media-access";

const photo: MediaAccessRecord = {
  id: "photo-1",
  kind: "PHOTO",
  caseId: "case-1",
  customer: { portalToken: "portal-1", portalTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"), archivedAt: null },
  case: { consultantId: "consultant-1", doctorId: "doctor-1" },
};

describe("canAccessMedia", () => {
  it("chỉ cho bác sĩ phụ trách xem ảnh điều trị", () => {
    expect(canAccessMedia({ id: "doctor-1", role: "DOCTOR" }, photo)).toBe(true);
    expect(canAccessMedia({ id: "doctor-2", role: "DOCTOR" }, photo)).toBe(false);
    expect(canAccessMedia({ id: "reception-1", role: "RECEPTION" }, photo)).toBe(false);
  });

  it("không cho cổ đông dùng grant để mở media nhạy cảm", () => {
    expect(canAccessMedia({ id: "shareholder-1", role: "SHAREHOLDER", permissions: { grant: ["clinical.photos.read"] } }, photo)).toBe(false);
  });

  it("portal token phải đúng phạm vi và chưa hết hạn", () => {
    const now = new Date("2029-01-01T00:00:00.000Z");
    expect(canAccessMedia(null, photo, "portal-1", now)).toBe(true);
    expect(canAccessMedia(null, photo, "other-token", now)).toBe(false);
    expect(canAccessMedia(null, photo, "portal-1", new Date("2030-01-01T00:00:00.000Z"))).toBe(false);
  });
});
