import { timingSafeEqual } from "node:crypto";
import { runChannelMaintenance } from "@/lib/channels/maintenance";

const failures = new Map<string, { count: number; resetAt: number }>();

function authorized(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ") || !secret) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

type Dependencies = {
  secret: string;
  run: () => Promise<{ checked: number; refreshed: number; degraded: number; payloadsPurged: number }>;
};

export async function handleMaintenanceRequest(request: Request, dependencies: Dependencies): Promise<Response> {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = failures.get(key);
  if (current && current.resetAt > now && current.count >= 10) return Response.json({ ok: false }, { status: 429 });
  if (!authorized(request.headers.get("authorization"), dependencies.secret)) {
    failures.set(key, current && current.resetAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetAt: now + 15 * 60 * 1000 });
    return Response.json({ ok: false }, { status: 401 });
  }
  failures.delete(key);
  const result = await dependencies.run();
  return Response.json(result);
}

export async function POST(request: Request): Promise<Response> {
  return handleMaintenanceRequest(request, {
    secret: process.env.CHANNEL_MAINTENANCE_SECRET ?? "",
    run: () => runChannelMaintenance(new Date()),
  });
}
