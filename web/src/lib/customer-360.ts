import { prisma } from "@/lib/db";
import { userCan, moduleCan } from "@/lib/permissions";
import { collaboratorCustomerWhere, getCollaboratorForUser } from "@/lib/collaborator-access";
import type { SafeUser } from "@/lib/auth";

export type Customer360Snapshot = {
  id: string;
  code: string;
  fullName: string;
  phoneLast5: string;
  source: string;
  sourceDetail: string | null;
  collaborator: { id: string; name: string } | null;
  collaboratorAssignedAt: Date | null;
  createdAt: Date;
  latestCase: {
    id: string;
    code: string;
    status: string;
    consultResult: string;
    debtAmount: number | null;
    createdAt: Date;
    locked: boolean;
  } | null;
  nextAppointment: {
    id: string;
    scheduledAt: Date;
    status: string;
    serviceInterest: string | null;
    kind: "appointment" | "follow-up";
  } | null;
  unreadConversationCount: number;
  nextAction: { label: string; href: string; reason: string };
  visibility: { canSeeClinical: boolean; canSeeFinance: boolean; isCollaborator: boolean };
};

type SnapshotUser = Pick<SafeUser, "id" | "role" | "permissions">;

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Dữ liệu tóm tắt để nhân sự biết khách đang ở bước nào và cần làm gì tiếp theo.
 * Hàm luôn kiểm tra scope ở server; không coi UI ẩn menu là một lớp bảo mật.
 */
export async function getCustomer360(customerId: string, user: SnapshotUser, now = new Date()): Promise<Customer360Snapshot | null> {
  const isCollaborator = user.role === "COLLABORATOR";
  const collaborator = isCollaborator ? await getCollaboratorForUser(user.id) : null;
  const scope = isCollaborator
    ? collaborator
      ? collaboratorCustomerWhere(collaborator.id, now)
      : { id: "__no_collaborator__" }
    : undefined;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...(scope ?? {}) },
    select: {
      id: true,
      code: true,
      fullName: true,
      phoneLast5: true,
      source: true,
      sourceDetail: true,
      collaboratorAssignedAt: true,
      createdAt: true,
      collaborator: { select: { id: true, name: true } },
      cases: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, code: true, status: true, consultResult: true, debtAmount: true, createdAt: true, locked: true },
      },
      appointments: {
        where: { scheduledAt: { gte: now }, status: { in: ["BOOKED", "CONFIRMED"] } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: { id: true, scheduledAt: true, status: true, serviceInterest: true },
      },
      followUps: {
        where: { scheduledAt: { gte: now }, status: { in: ["BOOKED", "CONFIRMED"] } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: { id: true, scheduledAt: true, status: true, note: true },
      },
      conversations: {
        where: { unreadCount: { gt: 0 } },
        select: { id: true },
      },
    },
  });

  if (!customer) return null;

  const canSeeClinical = !isCollaborator && moduleCan(user, "/ho-so");
  const canSeeFinance = !isCollaborator && userCan(user, "payment.add");
  const latestCase = customer.cases[0] ?? null;
  const appointment = customer.appointments[0];
  const followUp = customer.followUps[0];
  const nextAppointment = appointment && followUp
    ? (appointment.scheduledAt <= followUp.scheduledAt
      ? { ...appointment, kind: "appointment" as const }
      : { id: followUp.id, scheduledAt: followUp.scheduledAt, status: followUp.status, serviceInterest: followUp.note, kind: "follow-up" as const })
    : appointment
      ? { ...appointment, kind: "appointment" as const }
      : followUp
        ? { id: followUp.id, scheduledAt: followUp.scheduledAt, status: followUp.status, serviceInterest: followUp.note, kind: "follow-up" as const }
        : null;

  const nextAction = nextAppointment && userCan(user, "mod:lich-hen")
    ? { label: "Xem lịch sắp tới", href: `/lich-hen?date=${nextAppointment.scheduledAt.toISOString().slice(0, 10)}`, reason: nextAppointment.kind === "follow-up" ? "Có lịch tái khám sắp tới" : "Có lịch hẹn sắp tới" }
    : canSeeFinance && latestCase && numberOrNull(latestCase.debtAmount) && numberOrNull(latestCase.debtAmount)! > 0
      ? { label: "Xử lý công nợ", href: `/ho-so/${latestCase.id}`, reason: `Hồ sơ ${latestCase.code} còn công nợ` }
      : canSeeClinical && latestCase
        ? { label: "Mở hồ sơ điều trị", href: `/ho-so/${latestCase.id}`, reason: `Hồ sơ gần nhất ${latestCase.code}` }
        : { label: "Mở hồ sơ khách", href: `/khach-hang/${customer.id}`, reason: "Xem thông tin khách hàng" };

  return {
    id: customer.id,
    code: customer.code,
    fullName: customer.fullName,
    phoneLast5: customer.phoneLast5,
    source: customer.source,
    sourceDetail: customer.sourceDetail,
    collaborator: customer.collaborator,
    collaboratorAssignedAt: customer.collaboratorAssignedAt,
    createdAt: customer.createdAt,
    latestCase: latestCase
      ? { ...latestCase, debtAmount: canSeeFinance ? numberOrNull(latestCase.debtAmount) : null }
      : null,
    nextAppointment,
    unreadConversationCount: customer.conversations.length,
    nextAction,
    visibility: { canSeeClinical, canSeeFinance, isCollaborator },
  };
}
