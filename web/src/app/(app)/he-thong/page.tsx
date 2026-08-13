import { Settings2 } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getClinicConfig } from "@/lib/clinic-config";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cấu hình phòng khám" };

export default async function ClinicSettingsPage() {
  await requireCap("clinic.settings.manage");
  const config = await getClinicConfig();
  return (
    <div className="space-y-6">
      <PageHeader title="Cấu hình phòng khám" description="Đổi thương hiệu, liên hệ và nội dung vận hành mà không cần sửa code." icon={<Settings2 className="h-5 w-5" />} />
      <Card>
        <CardHeader><CardTitle>Thông tin hiển thị</CardTitle></CardHeader>
        <CardContent><ClinicProfileForm config={config} /></CardContent>
      </Card>
    </div>
  );
}
