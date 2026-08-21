import { endOfDay, startOfDay, addDays, subDays } from "date-fns";
import { prisma } from "./db";
import { moduleCan, userCan } from "./permissions";
import type { SafeUser } from "./auth";

export type WorkloadSummary = {
  total: number;
  followUps: number;
  appointments: number;
  newCustomers: number;
  debts: number;
};

/** Summary nhẹ cho shell/mobile; không thay thế getWorkqueue và không tính tiền. */
export async function getWorkloadSummary(user: Pick<SafeUser, "role" | "permissions">): Promise<WorkloadSummary> {
  const now = new Date();
  const canSeeCustomers = moduleCan(user, "/khach-hang");
  const canSeeFinance = userCan(user, "payment.add");
  const [followUps, appointments, newCustomers, debts] = await Promise.all([
    prisma.followUp.count({ where: { scheduledAt: { gte: startOfDay(now), lte: endOfDay(addDays(now, 2)) }, doneAt: null, status: { in: ["BOOKED", "CONFIRMED"] } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) }, status: { in: ["BOOKED", "CONFIRMED"] }, arrivedAt: null } }),
    canSeeCustomers ? prisma.customer.count({ where: { createdAt: { gte: subDays(now, 7) }, appointments: { none: { scheduledAt: { gte: now }, status: { in: ["BOOKED", "CONFIRMED"] } } } } }) : Promise.resolve(0),
    canSeeFinance ? prisma.caseRecord.count({ where: { createdAt: { lt: subDays(now, 15) }, debtAmount: { gt: 0 } } }) : Promise.resolve(0),
  ]);
  return { followUps, appointments, newCustomers, debts, total: followUps + appointments + newCustomers + debts };
}
