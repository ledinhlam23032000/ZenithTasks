import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditRequired } from "@/lib/audit";
import { encryptSecret } from "@/lib/secret-crypto";
import { exchangeZaloCode, getOaInfo } from "@/lib/channels/zalo";
import { ZALO_STATE_COOKIE, ZALO_SETTINGS_PATH } from "@/lib/channels/zalo-oauth-constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireCap("mod:ket-noi-kenh");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const deniedOnZalo = url.searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get(ZALO_STATE_COOKIE)?.value;
  store.delete(ZALO_STATE_COOKIE);

  if (deniedOnZalo) {
    redirect(`${ZALO_SETTINGS_PATH}?zalo_error=${encodeURIComponent("Đã huỷ cấp quyền trên Zalo.")}`);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    redirect(`${ZALO_SETTINGS_PATH}?zalo_error=${encodeURIComponent("Phiên kết nối không hợp lệ hoặc đã hết hạn — vui lòng thử lại.")}`);
  }

  let errorMessage = "";
  let connectedLabel = "";
  try {
    const tokenData = await exchangeZaloCode(code);
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Zalo không trả về access_token.");

    const info = await getOaInfo(accessToken);
    if (!info.ok) throw new Error(info.error);
    if (!info.oaId) throw new Error("Không xác định được oa_id từ Zalo.");

    const expiresInSec = Number(tokenData.expires_in ?? 3600) || 3600;
    await prisma.$transaction(async (tx) => {
      const account = await tx.channelAccount.upsert({
        where: { kind_externalId: { kind: "ZALO_OA", externalId: info.oaId } },
        create: {
          kind: "ZALO_OA",
          label: info.name,
          externalId: info.oaId,
          externalName: info.name,
          accessTokenEnc: encryptSecret(accessToken),
          refreshTokenEnc: tokenData.refresh_token ? encryptSecret(tokenData.refresh_token) : null,
          tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
          active: true,
          connectedById: user.id,
        },
        update: {
          label: info.name,
          externalName: info.name,
          accessTokenEnc: encryptSecret(accessToken),
          refreshTokenEnc: tokenData.refresh_token ? encryptSecret(tokenData.refresh_token) : null,
          tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
          active: true,
          connectedById: user.id,
        },
      });
      await auditRequired(tx, user.id, "CONNECT_CHANNEL", { entity: "ChannelAccount", entityId: account.id, meta: { kind: "ZALO_OA", label: info.name } });
    });
    connectedLabel = info.name;
  } catch (err) {
    // Không đưa thông báo thô của provider (có thể chứa request/token detail)
    // vào URL trình duyệt; chỉ log server-side và trả mã tổng quát cho người dùng.
    console.error("[oauth:zalo] callback failed", err instanceof Error ? err.message : err);
    errorMessage = "Không thể hoàn tất kết nối Zalo OA. Vui lòng thử lại hoặc liên hệ quản trị viên.";
  }

  if (errorMessage) {
    redirect(`${ZALO_SETTINGS_PATH}?zalo_error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(`${ZALO_SETTINGS_PATH}?zalo=${encodeURIComponent(connectedLabel)}`);
}
