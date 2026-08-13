import { prisma } from "./db";
import { canAccessCase, type CaseAccessUser } from "./case-access";
import { userCan } from "./permissions";

export type MediaAccessUser = CaseAccessUser;

export type MediaAccessRecord = {
  id: string;
  kind: "PHOTO" | "DOCUMENT";
  caseId: string | null;
  customer: { portalToken: string | null; portalTokenExpiresAt: Date | null; archivedAt?: Date | null };
  case: { consultantId: string | null; doctorId: string | null } | null;
};

export type AuthorizedMedia = MediaAccessRecord & { url: string; mode: "VIEW" | "DOWNLOAD" };

/**
 * Kiểm tra media theo đúng phạm vi hồ sơ, không dựa vào việc user đã đăng nhập.
 * Portal token chỉ có hiệu lực khi đúng khách hàng và chưa hết hạn.
 */
export function canAccessMedia(
  user: MediaAccessUser | null,
  record: MediaAccessRecord,
  portalToken?: string | null,
  now = new Date(),
): boolean {
  if (record.customer.archivedAt) return false;
  if (
    portalToken &&
    record.customer.portalToken === portalToken &&
    record.customer.portalTokenExpiresAt !== null &&
    record.customer.portalTokenExpiresAt.getTime() > now.getTime()
  ) {
    return true;
  }

  if (!user) return false;
  const capability = record.kind === "PHOTO" ? "clinical.photos.read" : "clinical.full.read";
  if (!userCan(user, capability)) return false;
  return canAccessCase(user, record.case ?? { consultantId: null, doctorId: null }, "read");
}

/**
 * Tìm media bằng id đường dẫn đã được kiểm soát và trả về bản ghi đã authorize.
 * `mediaId` là filename, không phải đường dẫn tùy ý từ trình duyệt.
 */
export async function authorizeMediaAccess(
  user: MediaAccessUser | null,
  mediaId: string,
  mode: "VIEW" | "DOWNLOAD",
  portalToken?: string | null,
): Promise<AuthorizedMedia> {
  if (!/^[A-Za-z0-9._-]+$/.test(mediaId) || mediaId.includes("..")) {
    throw new Error("MEDIA_NOT_FOUND");
  }

  const photo = await prisma.photo.findFirst({
    where: { OR: [{ url: `/media/${mediaId}` }, { url: `/uploads/${mediaId}` }] },
    select: {
      id: true,
      url: true,
      caseId: true,
      customer: { select: { portalToken: true, portalTokenExpiresAt: true, archivedAt: true } },
      case: { select: { consultantId: true, doctorId: true } },
    },
  });

  if (!photo) throw new Error("MEDIA_NOT_FOUND");
  const record: MediaAccessRecord = { ...photo, kind: "PHOTO" };
  if (!canAccessMedia(user, record, portalToken)) throw new Error("MEDIA_FORBIDDEN");
  return { ...record, url: photo.url, mode };
}
