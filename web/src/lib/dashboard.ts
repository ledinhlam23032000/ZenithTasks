import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { todayRange, monthRange, lastMonthRange, growthPct } from "@/lib/dates";

export type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export async function getAdminDashboard() {
  const today = todayRange();
  const month = monthRange();
  const last = lastMonthRange();

  const [
    todayAppts,
    servicedToday,
    followupsToday,
    cancelledToday,
    revThisMonth,
    revLastMonth,
    casesMonth,
    agreedMonth,
    consultGroups,
    consultants,
    recentCare,
    newCustomersMonth,
    newCustomersLast,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: today },
      select: { status: true },
    }),
    prisma.caseRecord.count({ where: { createdAt: today, consultResult: "AGREED" } }),
    prisma.followUp.count({ where: { scheduledAt: today } }),
    prisma.appointment.count({ where: { scheduledAt: today, status: { in: ["CANCELLED", "NO_SHOW"] } } }),
    prisma.payment.aggregate({ where: { paidAt: month }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { paidAt: last }, _sum: { amount: true } }),
    prisma.caseRecord.count({ where: { createdAt: month, consultResult: { not: "PENDING" } } }),
    prisma.caseRecord.count({ where: { createdAt: month, consultResult: "AGREED" } }),
    prisma.caseRecord.groupBy({
      by: ["consultantId"],
      where: { createdAt: month, consultantId: { not: null } },
      _count: { _all: true },
      _sum: { totalAmount: true, debtAmount: true },
    }),
    prisma.user.findMany({ where: { role: "CONSULTANT" }, select: { id: true, fullName: true } }),
    prisma.careMessage.findMany({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        customer: { select: { fullName: true, code: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.customer.count({ where: { createdAt: month } }),
    prisma.customer.count({ where: { createdAt: last } }),
  ]);

  // Đếm lịch hôm nay theo trạng thái
  const apptByStatus = todayAppts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // Số agreed theo từng tư vấn để tính tỉ lệ chốt
  const agreedByConsultant = await prisma.caseRecord.groupBy({
    by: ["consultantId"],
    where: { createdAt: month, consultResult: "AGREED", consultantId: { not: null } },
    _count: { _all: true },
  });
  const agreedMap = new Map(agreedByConsultant.map((g) => [g.consultantId, g._count._all]));
  const nameMap = new Map(consultants.map((c) => [c.id, c.fullName]));

  const consultantRows = consultGroups
    .map((g) => {
      const totalConsults = g._count._all;
      const agreed = agreedMap.get(g.consultantId) ?? 0;
      return {
        id: g.consultantId as string,
        name: nameMap.get(g.consultantId as string) ?? "—",
        consults: totalConsults,
        agreed,
        rate: totalConsults > 0 ? Math.round((agreed / totalConsults) * 100) : 0,
        revenue: toNum(g._sum.totalAmount),
        debt: toNum(g._sum.debtAmount),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const revenueThisMonth = toNum(revThisMonth._sum.amount);
  const revenueLastMonth = toNum(revLastMonth._sum.amount);

  return {
    today: {
      total: todayAppts.length,
      byStatus: apptByStatus,
      serviced: servicedToday,
      followups: followupsToday,
      cancelled: cancelledToday,
      done: apptByStatus["DONE"] ?? 0,
    },
    revenue: {
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      growth: growthPct(revenueThisMonth, revenueLastMonth),
    },
    consultRate: {
      total: casesMonth,
      agreed: agreedMonth,
      rate: casesMonth > 0 ? Math.round((agreedMonth / casesMonth) * 100) : 0,
    },
    customers: {
      thisMonth: newCustomersMonth,
      growth: growthPct(newCustomersMonth, newCustomersLast),
    },
    consultants: consultantRows,
    recentCare,
  };
}

/** Bảng điều khiển gọn cho các vai trò vận hành (lễ tân, tư vấn, bác sĩ, CSKH...). */
export async function getStaffSnapshot(userId: string, role: string) {
  const today = todayRange();

  const [todayAppts, myConsultsMonth, myAgreedMonth, openCases, todayCare] = await Promise.all([
    prisma.appointment.count({ where: { scheduledAt: today } }),
    prisma.caseRecord.count({ where: { consultantId: userId, createdAt: monthRange() } }),
    prisma.caseRecord.count({ where: { consultantId: userId, createdAt: monthRange(), consultResult: "AGREED" } }),
    prisma.caseRecord.count({
      where:
        role === "DOCTOR"
          ? { doctorId: userId, status: { in: ["SERVICED", "CONSULTED"] } }
          : role === "CONSULTANT"
            ? { consultantId: userId, status: { in: ["OPEN", "CONSULTED"] } }
            : { status: { in: ["OPEN", "CONSULTED", "SERVICED"] } },
    }),
    prisma.careMessage.count({ where: { createdAt: today } }),
  ]);

  return {
    todayAppts,
    myConsultsMonth,
    myAgreedMonth,
    myRate: myConsultsMonth > 0 ? Math.round((myAgreedMonth / myConsultsMonth) * 100) : 0,
    openCases,
    todayCare,
  };
}
