import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";

/**
 * Bảng lương theo tháng:
 * - Mỗi nhân sự: lương cơ bản + hoa hồng (theo % trên doanh thu phụ trách).
 *   • Tư vấn viên: doanh thu các hồ sơ đã CHỐT (AGREED) do mình tư vấn.
 *   • Bác sĩ: doanh thu các hồ sơ mình thực hiện.
 *   • Vai trò khác: chỉ lương cơ bản.
 * - Hoa hồng cộng tác viên (CTV): theo nguồn khách "Cộng tác viên".
 */
export async function getPayroll(monthDate: Date) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);

  const [users, cases] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true, code: true, baseSalary: true, commissionRate: true },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    }),
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte } },
      select: {
        consultantId: true,
        doctorId: true,
        totalAmount: true,
        consultResult: true,
        commissionAmount: true,
        customer: { select: { source: true, sourceDetail: true } },
      },
    }),
  ]);

  const revByConsultant = new Map<string, number>();
  const revByDoctor = new Map<string, number>();
  for (const c of cases) {
    const total = toNum(c.totalAmount);
    if (c.consultantId && c.consultResult === "AGREED") {
      revByConsultant.set(c.consultantId, (revByConsultant.get(c.consultantId) ?? 0) + total);
    }
    if (c.doctorId) revByDoctor.set(c.doctorId, (revByDoctor.get(c.doctorId) ?? 0) + total);
  }

  const rows = users.map((u) => {
    const base = toNum(u.baseSalary);
    const rate = toNum(u.commissionRate);
    const revenue = u.role === "DOCTOR" ? revByDoctor.get(u.id) ?? 0 : revByConsultant.get(u.id) ?? 0;
    const commission = Math.round((revenue * rate) / 100);
    return { id: u.id, name: u.fullName, code: u.code, role: u.role, base, rate, revenue, commission, total: base + commission };
  });

  // Hoa hồng cộng tác viên (gộp theo tên CTV)
  const ctvMap = new Map<string, number>();
  for (const c of cases) {
    if (c.customer?.source === "COLLABORATOR") {
      const name = c.customer.sourceDetail?.trim() || "CTV chưa ghi tên";
      ctvMap.set(name, (ctvMap.get(name) ?? 0) + toNum(c.commissionAmount));
    }
  }
  const ctv = [...ctvMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    rows,
    ctv,
    totalBase: rows.reduce((s, r) => s + r.base, 0),
    totalCommission: rows.reduce((s, r) => s + r.commission, 0),
    totalStaff: rows.reduce((s, r) => s + r.total, 0),
    totalCtv: ctv.reduce((s, r) => s + r.amount, 0),
  };
}
