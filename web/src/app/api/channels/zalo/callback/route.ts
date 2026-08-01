import { requireCap } from "@/lib/auth";
import { completeChannelOAuth } from "@/lib/channels/connect";

export async function GET(request: Request): Promise<Response> {
  const user = await requireCap("inbox.manageChannels");
  const origin = new URL(request.url).origin;
  try {
    await completeChannelOAuth("ZALO_OA", request.url, user.id);
    return Response.redirect(new URL("/cham-soc/cai-dat?connected=zalo", origin));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không kết nối được Zalo OA.";
    const target = new URL("/cham-soc/cai-dat", origin);
    target.searchParams.set("error", message);
    return Response.redirect(target);
  }
}
