import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  createPrismaIngestionStore,
  eventReceipt,
  ingestChannelEvent,
  type PrismaIngestionClient,
} from "../src/lib/channels/ingest";
import type { NormalizedChannelEvent } from "../src/lib/channels/types";

if (process.env.ALLOW_CHANNEL_INGEST_INTEGRATION !== "1") {
  throw new Error("Chỉ chạy với ALLOW_CHANNEL_INGEST_INTEGRATION=1 trên CSDL thử nghiệm tách biệt.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Thiếu DATABASE_URL thử nghiệm.");

const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const externalAccountId = `integration-page-${Date.now()}`;

async function main() {
  await client.channelAccount.create({
    data: {
      provider: "FACEBOOK_PAGE",
      externalAccountId,
      displayName: "Integration Page",
      status: "CONNECTED",
      connectedAt: new Date("2026-08-01T00:00:00.000Z"),
    },
  });
  const event: NormalizedChannelEvent = {
    kind: "message.received",
    provider: "FACEBOOK_PAGE",
    externalAccountId,
    externalUserId: "integration-psid",
    externalThreadId: "integration-psid",
    providerMessageId: "integration-mid-1",
    timestamp: new Date("2026-08-01T00:01:00.000Z"),
    message: { type: "TEXT", text: "Integration message", attachments: [] },
  };
  const store = createPrismaIngestionStore(client as unknown as PrismaIngestionClient);
  const first = await ingestChannelEvent(store, event, eventReceipt(event));
  const second = await ingestChannelEvent(store, event, eventReceipt(event));
  const [messages, conversations, receipts] = await Promise.all([
    client.inboxMessage.count({ where: { channelAccount: { externalAccountId } } }),
    client.conversation.count({ where: { thread: { channelAccount: { externalAccountId } } } }),
    client.webhookReceipt.count({ where: { externalAccountId } }),
  ]);

  if (first.duplicate || !second.duplicate || messages !== 1 || conversations !== 1 || receipts !== 1) {
    throw new Error(`Ingestion integration failed: ${JSON.stringify({ first, second, messages, conversations, receipts })}`);
  }
  console.log(`PRISMA_INGEST_OK messages=${messages} conversations=${conversations} receipts=${receipts}`);
}

main()
  .finally(async () => {
    await client.webhookReceipt.deleteMany({ where: { externalAccountId } });
    await client.channelAccount.deleteMany({ where: { externalAccountId } });
    await client.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
