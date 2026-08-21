"use server";

import { prisma } from "./db";
import { requireUser } from "./auth";
import { moduleCan, userCan } from "./permissions";
import { collaboratorCustomerWhere, getCollaboratorForUser } from "./collaborator-access";

export type SearchEntityType =
  | "customer"
  | "case"
  | "appointment"
  | "follow-up"
  | "material"
  | "service"
  | "plan"
  | "payment-request"
  | "cash-transaction"
  | "staff"
  | "collaborator";

export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  group: string;
  entityType?: SearchEntityType;
  status?: string;
  nextAction?: string;
  permissionScope?: string;
};

const TAKE = 8;

function decimalText(value: unknown): string {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

/** Tìm kiếm nghiệp vụ toàn cục, luôn giới hạn theo quyền và scope CTV ở server. */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const collaborator = user.role === "COLLABORATOR" ? await getCollaboratorForUser(user.id) : null;
  const customerScope = user.role === "COLLABORATOR"
    ? collaborator
      ? collaboratorCustomerWhere(collaborator.id)
      : { id: "__no_collaborator__" }
    : {};
  const tasks: Promise<SearchResult[]>[] = [];

  if (moduleCan(user, "/khach-hang")) {
    tasks.push(
      prisma.customer
        .findMany({
          where: {
            AND: [
              customerScope,
              {
                OR: [
                  { fullName: { contains: q, mode: "insensitive" } },
                  { code: { contains: q, mode: "insensitive" } },
                  { phoneLast5: { contains: q } },
                ],
              },
            ],
          },
          select: {
            id: true,
            fullName: true,
            code: true,
            phoneLast5: true,
            collaborator: { select: { name: true } },
            cases: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, code: true, status: true, debtAmount: true } },
            appointments: {
              where: { scheduledAt: { gte: new Date() }, status: { in: ["BOOKED", "CONFIRMED"] } },
              orderBy: { scheduledAt: "asc" },
              take: 1,
              select: { scheduledAt: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: TAKE,
        })
        .then((rows) =>
          rows.map((c) => {
            const latest = c.cases[0];
            const debt = Number(latest?.debtAmount ?? 0);
            const next = c.appointments[0];
            return {
              id: c.id,
              title: c.fullName,
              subtitle: `${c.code} · •••${c.phoneLast5}${c.collaborator ? ` · CTV ${c.collaborator.name}` : ""}`,
              href: `/khach-hang/${c.id}`,
              group: "Khách hàng",
              entityType: "customer" as const,
              status: latest?.status ?? "Chưa có hồ sơ",
              nextAction: next ? "Xem lịch sắp tới" : debt > 0 ? "Xử lý công nợ" : latest ? "Mở hồ sơ điều trị" : "Mở hồ sơ khách",
              permissionScope: user.role === "COLLABORATOR" ? "CTV · trong 6 tháng" : "Theo quyền khách hàng",
            };
          }),
        ),
    );
  }

  if (moduleCan(user, "/ho-so")) {
    tasks.push(
      prisma.caseRecord
        .findMany({
          where: { OR: [{ code: { contains: q, mode: "insensitive" } }, { customer: { fullName: { contains: q, mode: "insensitive" } } }] },
          select: { id: true, code: true, status: true, customer: { select: { id: true, fullName: true, phoneLast5: true } } },
          orderBy: { updatedAt: "desc" },
          take: TAKE,
        })
        .then((rows) => rows.map((c) => ({
          id: c.id,
          title: c.code,
          subtitle: `${c.customer.fullName} · •••${c.customer.phoneLast5}`,
          href: `/ho-so/${c.id}`,
          group: "Hồ sơ điều trị",
          entityType: "case" as const,
          status: c.status,
          nextAction: "Mở hồ sơ điều trị",
          permissionScope: "Theo quyền hồ sơ",
        }))),
    );
  }

  if (moduleCan(user, "/lich-hen")) {
    tasks.push(
      prisma.appointment
        .findMany({
          where: {
            OR: [
              { guestName: { contains: q, mode: "insensitive" } },
              { phoneLast5: { contains: q } },
              { customer: { fullName: { contains: q, mode: "insensitive" } } },
              { customer: { code: { contains: q, mode: "insensitive" } } },
            ],
          },
          select: { id: true, guestName: true, phoneLast5: true, scheduledAt: true, status: true, serviceInterest: true, customer: { select: { id: true, fullName: true, code: true } } },
          orderBy: { scheduledAt: "desc" },
          take: TAKE,
        })
        .then((rows) => rows.map((a) => ({
          id: a.id,
          title: a.customer?.fullName ?? a.guestName ?? "Lịch hẹn chưa có tên",
          subtitle: `${a.customer?.code ?? "Lịch hẹn"} · ${a.scheduledAt.toLocaleString("vi-VN")} · ${a.serviceInterest ?? "Chưa chọn dịch vụ"}`,
          href: a.customer ? `/khach-hang/${a.customer.id}` : "/lich-hen",
          group: "Lịch hẹn",
          entityType: "appointment" as const,
          status: a.status,
          nextAction: "Mở lịch hẹn",
          permissionScope: "Theo quyền lịch hẹn",
        }))),
    );

    tasks.push(
      prisma.followUp
        .findMany({
          where: { OR: [{ customer: { fullName: { contains: q, mode: "insensitive" } } }, { customer: { code: { contains: q, mode: "insensitive" } } }, { note: { contains: q, mode: "insensitive" } }] },
          select: { id: true, scheduledAt: true, status: true, note: true, customer: { select: { id: true, fullName: true, code: true } } },
          orderBy: { scheduledAt: "desc" },
          take: TAKE,
        })
        .then((rows) => rows.map((f) => ({
          id: f.id,
          title: f.customer.fullName,
          subtitle: `${f.customer.code} · Tái khám ${f.scheduledAt.toLocaleString("vi-VN")}${f.note ? ` · ${f.note}` : ""}`,
          href: `/khach-hang/${f.customer.id}`,
          group: "Tái khám",
          entityType: "follow-up" as const,
          status: f.status,
          nextAction: "Mở lịch tái khám",
          permissionScope: "Theo quyền lịch hẹn",
        }))),
    );
  }

  if (moduleCan(user, "/kho")) {
    tasks.push(
      prisma.material
        .findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }, select: { id: true, name: true, unit: true, sku: true, active: true }, take: TAKE })
        .then((rows) => rows.map((m) => ({
          id: m.id,
          title: m.name,
          subtitle: `${m.sku ?? "Không có SKU"} · ${m.unit}`,
          href: "/kho",
          group: "Vật tư",
          entityType: "material" as const,
          status: m.active ? "Đang dùng" : "Ngừng dùng",
          nextAction: "Mở kho vật tư",
          permissionScope: "Theo quyền kho",
        }))),
    );
  }

  if (moduleCan(user, "/danh-muc")) {
    tasks.push(
      prisma.service
        .findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] }, select: { id: true, name: true, category: true, active: true, defaultPrice: true }, take: TAKE })
        .then((rows) => rows.map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: `${s.category ?? "Chưa phân loại"} · ${decimalText(s.defaultPrice)} VND`,
          href: "/danh-muc",
          group: "Dịch vụ",
          entityType: "service" as const,
          status: s.active ? "Đang dùng" : "Ngừng dùng",
          nextAction: "Mở danh mục dịch vụ",
          permissionScope: "Theo quyền danh mục",
        }))),
    );
  }

  if (moduleCan(user, "/ke-toan")) {
    tasks.push(
      prisma.paymentRequest
        .findMany({
          where: { OR: [{ requestNo: { contains: q, mode: "insensitive" } }, { payeeName: { contains: q, mode: "insensitive" } }, { reason: { contains: q, mode: "insensitive" } }] },
          select: { id: true, requestNo: true, payeeName: true, amount: true, status: true, month: true },
          orderBy: { updatedAt: "desc" },
          take: TAKE,
        })
        .then((rows) => rows.map((r) => ({
          id: r.id,
          title: r.requestNo,
          subtitle: `${r.payeeName} · ${decimalText(r.amount)} VND${r.month ? ` · ${r.month}` : ""}`,
          href: `/ke-toan/de-nghi-thanh-toan/${r.id}`,
          group: "Đề nghị thanh toán",
          entityType: "payment-request" as const,
          status: r.status,
          nextAction: r.status === "PENDING" ? "Duyệt phiếu" : r.status === "APPROVED" ? "Ghi đã thanh toán" : "Mở phiếu",
          permissionScope: "Theo quyền kế toán",
        }))),
    );

    tasks.push(
      prisma.cashTransaction
        .findMany({
          where: { OR: [{ vendor: { contains: q, mode: "insensitive" } }, { note: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] },
          select: { id: true, vendor: true, note: true, category: true, amount: true, occurredAt: true, type: true },
          orderBy: { occurredAt: "desc" },
          take: TAKE,
        })
        .then((rows) => rows.map((r) => ({
          id: r.id,
          title: r.vendor ?? r.category,
          subtitle: `${r.category} · ${decimalText(r.amount)} VND · ${r.occurredAt.toLocaleDateString("vi-VN")}`,
          href: "/thu-chi",
          group: "Sổ thu chi",
          entityType: "cash-transaction" as const,
          status: r.type,
          nextAction: "Mở sổ thu chi",
          permissionScope: "Theo quyền thu chi",
        }))),
    );
  }

  if (moduleCan(user, "/ke-hoach")) {
    tasks.push(
      prisma.plan
        .findMany({ where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { note: { contains: q, mode: "insensitive" } }] }, select: { id: true, title: true, note: true }, take: TAKE })
        .then((rows) => rows.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: p.note ?? undefined,
          href: `/ke-hoach/${p.id}`,
          group: "Kế hoạch",
          entityType: "plan" as const,
          nextAction: "Mở kế hoạch",
          permissionScope: "Theo quyền kế hoạch",
        }))),
    );
  }

  if (user.role === "ADMIN" && userCan(user, "mod:nhan-su")) {
    tasks.push(
      prisma.user
        .findMany({
          where: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] },
          select: { id: true, fullName: true, username: true, code: true, role: true, active: true, employmentStatus: true },
          take: TAKE,
        })
        .then((rows) => rows.map((s) => ({
          id: s.id,
          title: s.fullName,
          subtitle: `@${s.username}${s.code ? ` · ${s.code}` : ""}`,
          href: `/nhan-su/${s.id}`,
          group: "Nhân sự",
          entityType: "staff" as const,
          status: s.employmentStatus ?? (s.active ? "ACTIVE" : "INACTIVE"),
          nextAction: "Mở hồ sơ nhân sự",
          permissionScope: "Chỉ quản trị viên",
        }))),
    );
    tasks.push(
      prisma.collaborator
        .findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }, select: { id: true, name: true, phone: true, active: true, userId: true }, take: TAKE })
        .then((rows) => rows.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: `${c.phone ? `SĐT ${c.phone}` : "Chưa có SĐT"}${c.userId ? " · Đã có tài khoản" : " · Chưa đăng ký"}`,
          href: `/cong-tac-vien/${encodeURIComponent(c.name)}`,
          group: "Cộng tác viên",
          entityType: "collaborator" as const,
          status: c.active ? "Đang hoạt động" : "Ngừng hoạt động",
          nextAction: "Mở hồ sơ CTV",
          permissionScope: "Chỉ quản trị viên",
        }))),
    );
  }

  const results = await Promise.all(tasks);
  return results.flat();
}
