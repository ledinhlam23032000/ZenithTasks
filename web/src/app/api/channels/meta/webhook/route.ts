import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createPrismaIngestionStore,
  eventReceipt,
  ingestChannelEvent,
  type ChannelIngestionStore,
  type PrismaIngestionClient,
} from "@/lib/channels/ingest";
import { normalizeMetaWebhook } from "@/lib/channels/providers/meta";
import { verifyMetaSignature } from "@/lib/channels/signatures";

type MetaWebhookDependencies = {
  store: ChannelIngestionStore;
  appSecret: string;
};

function constantTimeTextEqual(left: string | null, right: string): boolean {
  if (left === null) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function verifyMetaWebhook(request: Request, verifyToken: string): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !challenge || !verifyToken || !constantTimeTextEqual(token, verifyToken)) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function handleMetaWebhook(request: Request, dependencies: MetaWebhookDependencies): Promise<Response> {
  const rawText = await request.text();
  const raw = new TextEncoder().encode(rawText);
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), dependencies.appSecret)) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const events = normalizeMetaWebhook(payload);
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

export async function GET(request: Request): Promise<Response> {
  return verifyMetaWebhook(request, process.env.META_WEBHOOK_VERIFY_TOKEN ?? "");
}

export async function POST(request: Request): Promise<Response> {
  return handleMetaWebhook(request, {
    store: productionStore,
    appSecret: process.env.META_APP_SECRET ?? "",
  });
}
