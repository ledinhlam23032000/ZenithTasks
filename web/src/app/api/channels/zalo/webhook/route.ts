import { prisma } from "@/lib/db";
import {
  createPrismaIngestionStore,
  eventReceipt,
  ingestChannelEvent,
  type ChannelIngestionStore,
  type PrismaIngestionClient,
} from "@/lib/channels/ingest";
import { normalizeZaloWebhook } from "@/lib/channels/providers/zalo";
import { verifyZaloSignature } from "@/lib/channels/signatures";

type ZaloWebhookDependencies = {
  store: ChannelIngestionStore;
  appId: string;
  oaSecret: string;
};

function payloadTimestamp(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).timestamp;
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export async function handleZaloWebhook(request: Request, dependencies: ZaloWebhookDependencies): Promise<Response> {
  const rawText = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const timestamp = request.headers.get("x-zevent-timestamp") ?? payloadTimestamp(payload);
  if (!timestamp || !verifyZaloSignature(rawText, timestamp, request.headers.get("x-zevent-signature"), dependencies.appId, dependencies.oaSecret)) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const events = normalizeZaloWebhook(payload);
  try {
    for (const event of events) {
      await ingestChannelEvent(dependencies.store, event, eventReceipt(event));
    }
  } catch {
    return Response.json({ ok: false, error: "ingestion_failed" }, { status: 500 });
  }
  return Response.json({ ok: true, events: events.length });
}

const productionStore = createPrismaIngestionStore(prisma as unknown as PrismaIngestionClient);

export async function POST(request: Request): Promise<Response> {
  return handleZaloWebhook(request, {
    store: productionStore,
    appId: process.env.ZALO_APP_ID ?? "",
    oaSecret: process.env.ZALO_OA_SECRET ?? process.env.ZALO_APP_SECRET ?? "",
  });
}
