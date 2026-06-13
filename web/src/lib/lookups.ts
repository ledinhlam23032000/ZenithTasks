import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";

export async function getActiveServices() {
  const rows = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, defaultPrice: true },
  });
  return rows.map((r) => ({ ...r, defaultPrice: toNum(r.defaultPrice) }));
}

export async function getConsultants() {
  return prisma.user.findMany({
    where: { role: "CONSULTANT", active: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

export async function getDoctors() {
  return prisma.user.findMany({
    where: { role: "DOCTOR", active: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

export async function getActiveMaterials() {
  return prisma.material.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true },
  });
}
