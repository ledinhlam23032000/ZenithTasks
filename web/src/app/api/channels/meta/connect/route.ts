import { requireCap } from "@/lib/auth";
import { beginChannelOAuth } from "@/lib/channels/connect";

export async function GET(request: Request): Promise<Response> {
  const user = await requireCap("inbox.manageChannels");
  const url = await beginChannelOAuth("FACEBOOK_PAGE", user.id, new URL(request.url).origin);
  return Response.redirect(url);
}
