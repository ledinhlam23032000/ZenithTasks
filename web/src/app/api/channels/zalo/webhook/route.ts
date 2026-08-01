import { prisma } from "@/lib/db";
import {
  createPrismaIngestionStore,
  type PrismaIngestionClient,
} from "@/lib/channels/ingest";
import { handleZaloWebhook } from "@/lib/channels/zalo-webhook";

const productionStore = createPrismaIngestionStore(prisma as unknown as PrismaIngestionClient);

export async function POST(request: Request): Promise<Response> {
  return handleZaloWebhook(request, {
    store: productionStore,
    appId: process.env.ZALO_APP_ID ?? "",
    oaSecret: process.env.ZALO_OA_SECRET ?? process.env.ZALO_APP_SECRET ?? "",
  });
}
