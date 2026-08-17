import webpush from "web-push";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { userCan } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/client";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon?: string;
};

type VapidConfig = { publicKey: string; privateKey: string; subject: string };

function vapidConfig(): VapidConfig | null {
  const envPublic = (process.env.PUSH_VAPID_PUBLIC_KEY ?? "").trim();
  const envPrivate = (process.env.PUSH_VAPID_PRIVATE_KEY ?? "").trim();
  const subject = (process.env.PUSH_VAPID_SUBJECT ?? "").trim() || "mailto:admin@localhost";
  if (envPublic && envPrivate) return { publicKey: envPublic, privateKey: envPrivate, subject };

  const storePath = path.join(process.cwd(), ".runtime", "push-vapid.json");
  try {
    const stored = JSON.parse(fs.readFileSync(storePath, "utf8")) as Partial<VapidConfig>;
    if (stored.publicKey && stored.privateKey) return { publicKey: stored.publicKey, privateKey: stored.privateKey, subject: stored.subject || subject };
  } catch {
    /* Chưa có khóa — tạo một lần rồi lưu trong volume runtime. */
  }

  try {
    const generated = webpush.generateVAPIDKeys();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ ...generated, subject }), { encoding: "utf8", mode: 0o600 });
    return { publicKey: generated.publicKey, privateKey: generated.privateKey, subject };
  } catch (error) {
    console.warn("[push] Không tạo được khóa VAPID:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function pushConfigured(): boolean {
  return Boolean(vapidConfig());
}

export function pushPublicKey(): string {
  return vapidConfig()?.publicKey ?? "";
}

function configure() {
  const config = vapidConfig();
  if (!config) return false;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
}

/** Gửi thông báo cho nhân sự có quyền xem hộp thư; lỗi push không được làm webhook thất bại. */
export async function sendCarePush(payload: PushPayload): Promise<void> {
  if (!configure()) return;

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, role: true, permissions: true },
  });
  const eligible = users.filter((u) => userCan({ role: u.role as Role, permissions: u.permissions }, "mod:cham-soc-hop-thu"));
  if (eligible.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: eligible.map((u) => u.id) } },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
        } else {
          console.warn("[push] Không gửi được thông báo:", error instanceof Error ? error.message : error);
        }
      }
    }),
  );
}
