import { handleMaintenanceRequest } from "@/lib/channels/maintenance-handler";
import { runChannelMaintenance } from "@/lib/channels/maintenance";

export async function POST(request: Request): Promise<Response> {
  return handleMaintenanceRequest(request, {
    secret: process.env.CHANNEL_MAINTENANCE_SECRET ?? "",
    run: () => runChannelMaintenance(new Date()),
  });
}
