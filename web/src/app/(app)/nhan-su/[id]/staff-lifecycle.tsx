"use client";

import { ArrowRightLeft } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { convertStaffToCollaborator } from "../actions";

export function ConvertStaffToCollaboratorButton({ userId, name, hasProfile }: { userId: string; name: string; hasProfile: boolean }) {
  return (
    <ConfirmButton
      action={convertStaffToCollaborator}
      fields={{ userId }}
      confirmText={`${hasProfile ? "Kích hoạt lại" : "Tạo liên kết CTV cho"} ${name}? Hệ thống giữ nguyên tài khoản, khách, ca, hồ sơ, tài liệu và lịch sử; chỉ chuyển vai trò đăng nhập sang CTV.`}
      confirmLabel="Xác nhận chuyển"
      danger={false}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
    >
      <ArrowRightLeft className="h-4 w-4" /> Chuyển thành CTV
    </ConfirmButton>
  );
}
