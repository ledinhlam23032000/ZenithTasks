"use server";

import { prisma } from "./db";
import { requireUser } from "./auth";
import { moduleCan } from "./permissions";

export type SearchResult = { id: string; title: string; subtitle?: string; href: string; group: string };

const TAKE = 6;

/** Tìm kiếm toàn cục (Ctrl/Cmd+K): khách hàng, hồ sơ điều trị, vật tư — chỉ trong phạm vi quyền của người dùng. */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const tasks: Promise<SearchResult[]>[] = [];

  if (moduleCan(user, "/khach-hang")) {
    tasks.push(
      prisma.customer
        .findMany({
          where: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { phoneLast5: { contains: q } },
            ],
          },
          select: { id: true, fullName: true, code: true, phoneLast5: true },
          take: TAKE,
        })
        .then((rows) =>
          rows.map((c) => ({
            id: c.id,
            title: c.fullName,
            subtitle: `${c.code}${c.phoneLast5 ? ` · •••${c.phoneLast5}` : ""}`,
            href: `/khach-hang/${c.id}`,
            group: "Khách hàng",
          })),
        ),
    );
  }

  if (moduleCan(user, "/ho-so")) {
    tasks.push(
      prisma.caseRecord
        .findMany({
          where: {
            OR: [{ code: { contains: q, mode: "insensitive" } }, { customer: { fullName: { contains: q, mode: "insensitive" } } }],
          },
          select: { id: true, code: true, customer: { select: { fullName: true } } },
          take: TAKE,
        })
        .then((rows) =>
          rows.map((c) => ({
            id: c.id,
            title: c.code,
            subtitle: c.customer.fullName,
            href: `/ho-so/${c.id}`,
            group: "Hồ sơ điều trị",
          })),
        ),
    );
  }

  if (moduleCan(user, "/kho")) {
    tasks.push(
      prisma.material
        .findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          select: { id: true, name: true, unit: true },
          take: TAKE,
        })
        .then((rows) =>
          rows.map((m) => ({
            id: m.id,
            title: m.name,
            subtitle: m.unit,
            href: "/kho",
            group: "Vật tư",
          })),
        ),
    );
  }

  const results = await Promise.all(tasks);
  return results.flat();
}
