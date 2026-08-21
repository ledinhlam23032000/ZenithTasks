import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";

export async function getActiveServices() {
  const rows = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, listPrice: true, defaultPrice: true },
  });
  return rows.map((r) => ({ ...r, listPrice: toNum(r.listPrice), defaultPrice: toNum(r.defaultPrice) }));
}

export async function getConsultants() {
  // Bất kỳ nhân sự đang hoạt động nào cũng có thể là người tư vấn (không bắt buộc vai trò Tư vấn viên).
  return prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
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

export async function getNurses() {
  return prisma.user.findMany({
    where: { role: "NURSE", active: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

export async function getActiveCollaborators() {
  return prisma.collaborator.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getActiveMaterials() {
  return prisma.material.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true },
  });
}
