import {
  eventReceipt,
  ingestChannelEvent,
  type ChannelIngestionStore,
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
