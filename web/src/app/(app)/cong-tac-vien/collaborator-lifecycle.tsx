"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, Archive, CheckCircle2, LoaderCircle, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ROLE_LABELS } from "@/lib/rbac";
import { archiveCollaborator, convertCollaboratorToStaff, restoreCollaborator, suspendCollaborator } from "./actions";

const STAFF_ROLES = ["MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "NURSE", "CARE", "SHAREHOLDER"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

type LifecycleCollaborator = {
  id: string;
  name: string;
  userId: string | null;
  active: boolean;
  archivedAt: Date | string | null;
  suspendedAt: Date | string | null;
};

export function CollaboratorLifecycleActions({ collaborator }: { collaborator: LifecycleCollaborator }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<StaffRole>("RECEPTION");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isArchived = Boolean(collaborator.archivedAt);
  const isSuspended = !collaborator.active && !isArchived;

  function convert() {
    setError(null);
    const formData = new FormData();
    formData.set("collaboratorId", collaborator.id);
    formData.set("role", role);
    startTransition(async () => {
      try {
        await convertCollaboratorToStaff(formData);
        setOpen(false);
        router.refresh();
      } catch {
        setError("Không thể chuyển đổi. Hãy kiểm tra tài khoản và hồ sơ CTV rồi thử lại.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isArchived || isSuspended ? (
        <ConfirmButton
          action={restoreCollaborator}
          fields={{ id: collaborator.id }}
          confirmText={`Khôi phục hồ sơ CTV “${collaborator.name}”? Tài khoản sẽ hoạt động lại nếu đây là tài khoản CTV.`}
          confirmLabel="Khôi phục"
          danger={false}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <CheckCircle2 className="h-4 w-4" /> Khôi phục
        </ConfirmButton>
      ) : (
        <>
          <ConfirmButton
            action={suspendCollaborator}
            fields={{ id: collaborator.id }}
            confirmText={`Tạm đình chỉ “${collaborator.name}”? Hồ sơ và lịch sử vẫn giữ nguyên, nhưng CTV sẽ không nhận khách mới hoặc đăng nhập cổng CTV.`}
            confirmLabel="Đình chỉ"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
          >
            <PauseCircle className="h-4 w-4" /> Đình chỉ
          </ConfirmButton>
          <ConfirmButton
            action={archiveCollaborator}
            fields={{ id: collaborator.id }}
            confirmText={`Lưu trữ hồ sơ “${collaborator.name}”? Đây không phải xóa; toàn bộ khách, ca, tài liệu và lịch sử hoa hồng vẫn được giữ.`}
            confirmLabel="Lưu trữ"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            <Archive className="h-4 w-4" /> Lưu trữ
          </ConfirmButton>
        </>
      )}
      {collaborator.userId && !isArchived && (
        <>
          <Button variant="secondary" onClick={() => { setError(null); setOpen(true); }}>
            <ArrowRightLeft className="h-4 w-4" /> Chuyển thành nhân viên
          </Button>
          <Modal open={open} onClose={() => !pending && setOpen(false)} title={`Chuyển ${collaborator.name} thành nhân viên`} size="sm">
            <p className="text-sm leading-6 text-slate-600">Giữ nguyên tài khoản, khách, ca, tài liệu và lịch sử hoa hồng. Chỉ thay đổi vai trò đăng nhập; việc chuyển đổi do quản trị viên thực hiện.</p>
            <div className="mt-4">
              <Label htmlFor="staff-role">Vai trò nhân viên</Label>
              <Select id="staff-role" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
                {STAFF_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
              </Select>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button>
              <button type="button" onClick={convert} disabled={pending} className={buttonVariants()}>
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Xác nhận chuyển
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
