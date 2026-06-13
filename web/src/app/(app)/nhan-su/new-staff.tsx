"use client";

import { useActionState, useEffect, useState } from "react";
import { UserPlus, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { ROLE_LABELS } from "@/lib/rbac";
import { createStaff, type StaffFormState } from "./actions";

export function NewStaffButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Thêm nhân viên
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm tài khoản nhân viên">
        <StaffForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function StaffForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(createStaff, {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Họ và tên *</Label>
        <Input id="fullName" name="fullName" placeholder="Nguyễn Văn B" required autoFocus />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="username">Tên đăng nhập *</Label>
          <Input id="username" name="username" placeholder="letan2" required />
        </div>
        <div>
          <Label htmlFor="role">Vai trò *</Label>
          <Select id="role" name="role" defaultValue="RECEPTION">
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Mật khẩu *</Label>
          <Input id="password" name="password" type="text" placeholder="Tối thiểu 6 ký tự" required />
        </div>
        <div>
          <Label htmlFor="phone">SĐT nội bộ</Label>
          <Input id="phone" name="phone" placeholder="09xx…" />
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Hủy</Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Tạo tài khoản
        </button>
      </div>
    </form>
  );
}
