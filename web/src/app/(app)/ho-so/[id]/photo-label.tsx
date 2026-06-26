import { Badge } from "@/components/ui/badge";
import type { PhotoType } from "@/generated/prisma/client";

export function PhotoTypeLabel({ type, index }: { type: PhotoType; index?: number | null }) {
  if (type === "BEFORE") return <Badge tone="purple">Trước</Badge>;
  if (type === "AFTER") return <Badge tone="green">Sau</Badge>;
  if (type === "CLINICAL") return <Badge tone="amber">Cận lâm sàng</Badge>;
  return <Badge tone="blue">Tái khám{index ? ` lần ${index}` : ""}</Badge>;
}
