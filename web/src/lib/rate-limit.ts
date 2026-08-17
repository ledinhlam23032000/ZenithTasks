import { prisma } from "./db";

/**
 * Durable rate limiting for login, public booking and customer-portal writes.
 *
 * The old implementation kept counters only in one Node.js process, so a
 * restart or a second app instance reset the protection. Buckets are now held
 * in PostgreSQL and updated under row locks. If a deployment is still running
 * before the migration, the small in-process fallback keeps the app usable
 * while the entrypoint retries migrations.
 */

type Bucket = { count: number; firstAt: number; lockedUntil: number };
const fallback = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

type Decision = { ok: boolean; retryAfterSec?: number };

function fallbackInspect(key: string, max: number): Decision {
  const now = Date.now();
  const b = fallback.get(key);
  if (!b) return { ok: true };
  if (b.lockedUntil > now) return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  if (now - b.firstAt > WINDOW_MS) {
    fallback.delete(key);
    return { ok: true };
  }
  if (b.count >= max) {
    b.lockedUntil = now + LOCK_MS;
    return { ok: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { ok: true };
}

function fallbackIncrement(key: string): number {
  const now = Date.now();
  const old = fallback.get(key);
  const b = !old || now - old.firstAt > WINDOW_MS
    ? { count: 1, firstAt: now, lockedUntil: 0 }
    : { ...old, count: old.count + 1 };
  fallback.set(key, b);
  if (fallback.size > 5000) {
    for (const [k, v] of fallback) if (now - v.firstAt > WINDOW_MS && v.lockedUntil < now) fallback.delete(k);
  }
  return b.count;
}

async function inspect(key: string, max: number): Promise<Decision> {
  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ count: number; firstAt: Date; lockedUntil: Date | null }>>`
        SELECT "count", "firstAt", "lockedUntil"
        FROM "RateLimitBucket"
        WHERE "key" = ${key}
        FOR UPDATE
      `;
      const row = rows[0];
      if (!row) return { ok: true };
      const now = Date.now();
      if (row.lockedUntil && row.lockedUntil.getTime() > now) {
        return { ok: false, retryAfterSec: Math.ceil((row.lockedUntil.getTime() - now) / 1000) };
      }
      if (now - row.firstAt.getTime() > WINDOW_MS) {
        await tx.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" = ${key}`;
        return { ok: true };
      }
      if (row.count >= max) {
        const lockedUntil = new Date(now + LOCK_MS);
        await tx.$executeRaw`UPDATE "RateLimitBucket" SET "lockedUntil" = ${lockedUntil}, "updatedAt" = NOW() WHERE "key" = ${key}`;
        return { ok: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
      }
      return { ok: true };
    });
  } catch {
    return fallbackInspect(key, max);
  }
}

async function increment(key: string): Promise<number> {
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.$executeRaw`
        INSERT INTO "RateLimitBucket" ("key", "count", "firstAt", "lockedUntil", "updatedAt")
        VALUES (${key}, 1, ${now}, NULL, ${now})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "firstAt" < ${new Date(now.getTime() - WINDOW_MS)} THEN 1
            ELSE "count" + 1
          END,
          "firstAt" = CASE
            WHEN "firstAt" < ${new Date(now.getTime() - WINDOW_MS)} THEN ${now}
            ELSE "firstAt"
          END,
          "lockedUntil" = NULL,
          "updatedAt" = ${now}
      `;
      const rows = await tx.$queryRaw<Array<{ count: number }>>`
        SELECT "count" FROM "RateLimitBucket" WHERE "key" = ${key}
      `;
      return Number(rows[0]?.count ?? 1);
    });
  } catch {
    return fallbackIncrement(key);
  }
}

/** Check a login key before verifying credentials. */
export async function checkLoginAllowed(ip: string, username: string): Promise<Decision> {
  const account = await inspect(`login:user:${ip}:${username}`, 6);
  if (!account.ok) return account;
  return inspect(`login:ip:${ip}`, 30);
}

/** Record one failed login against both the account and source IP. */
export async function registerLoginFailure(ip: string, username: string): Promise<void> {
  await Promise.all([
    increment(`login:user:${ip}:${username}`),
    increment(`login:ip:${ip}`),
  ]);
}

export async function clearLoginFailures(ip: string, username: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM "RateLimitBucket"
      WHERE "key" IN (${`login:user:${ip}:${username}`}, ${`login:ip:${ip}`})
    `;
  } catch {
    fallback.delete(`login:user:${ip}:${username}`);
    fallback.delete(`login:ip:${ip}`);
  }
}

/** Increment a general-purpose bucket; returns TRUE after the limit is passed. */
export async function bump(key: string, max: number): Promise<boolean> {
  return (await increment(`general:${key}`)) > max;
}
