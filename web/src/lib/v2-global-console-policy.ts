import type { Prisma } from "../generated/prisma/client";

export function canOpenGlobalProjectConsole(role: string) {
  return role === "ADMIN";
}

export function projectConsoleWhere(role: string, userId: string, search: string): Prisma.ZProjectWhereInput {
  const normalized = search.trim().slice(0, 80);
  return {
    ...(role === "ADMIN" ? {} : { members: { some: { userId, active: true } } }),
    ...(normalized ? { OR: [{ code: { contains: normalized, mode: "insensitive" } }, { name: { contains: normalized, mode: "insensitive" } }] } : {}),
  };
}

export const GLOBAL_PROJECT_PAGE_SIZE = 50;
