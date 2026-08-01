import { prisma } from "@/lib/db";
import {
  createPrismaIngestionStore,
  type PrismaIngestionClient,
} from "@/lib/channels/ingest";
import { handleMetaWebhook, verifyMetaWebhook } from "@/lib/channels/meta-webhook";

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
