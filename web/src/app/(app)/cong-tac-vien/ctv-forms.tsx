"use client";

import { useState } from "react";
import { Pencil, LoaderCircle, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { createCollaborator, updateCollaborator } from "./actions";

export type CtvProfile = {
  id: string;
  name: string;
  phone: string;
  bankAccount: string;
  bankName: string;
  bankHolder: string;
  note: string;
};

function AccountFields() {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">Tài khoản đăng nhập CTV</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Tên đăng nhập *</Label>
          <Input name="username" autoComplete="off" placeholder="VD: ctv.mylinh" required />
        </div>
        <div>
          <Label>Mật khẩu *</Label>
          <Input name="password" type="password" autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" minLength={12} required />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Mật khẩu do quản trị viên đặt và có thể đặt lại trong phần Nhân sự nếu cần.</p>
    </div>
  );
}

function Fields({ ctv, lockName }: { ctv?: Partial<CtvProfile>; lockName?: boolean }) {
  return (
    <>
      <div>
        <Label>Tên cộng tác viên *</Label>
        <Input name="name" defaultValue={ctv?.name ?? ""} placeholder="VD: CTV Mỹ Linh" required readOnly={lockName} />
        {lockName && <p className="mt-1 text-xs text-slate-400">Tên là định danh hiển thị; khách cũ đã liên kết sẽ tự đồng bộ khi đổi thông tin.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Số điện thoại</Label>
          <Input name="phone" inputMode="tel" defaultValue={ctv?.phone ?? ""} />
        </div>
        <div>
          <Label>Số tài khoản</Label>
          <Input name="bankAccount" defaultValue={ctv?.bankAccount ?? ""} />
        </div>
        <div>
          <Label>Ngân hàng</Label>
          <Input name="bankName" defaultValue={ctv?.bankName ?? ""} />
        </div>
        <div>
          <Label>Chủ tài khoản</Label>
          <Input name="bankHolder" defaultValue={ctv?.bankHolder ?? ""} />
        </div>
      </div>
      <div>
        <Label>Ghi chú</Label>
        <Textarea name="note" defaultValue={ctv?.note ?? ""} placeholder="Khu vực, mức hoa hồng thỏa thuận, lưu ý…" />
      </div>
    </>
  );
}

export function NewCollaboratorButton({ defaultName }: { defaultName?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(createCollaborator, () => setOpen(false));
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> {defaultName ? "Đăng ký CTV" : "Thêm cộng tác viên"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={defaultName ? "Đăng ký CTV từ dữ liệu đã có" : "Thêm cộng tác viên"} size="lg">
        <form action={action} className="space-y-4">
          {defaultName && <input type="hidden" name="legacyName" value={defaultName} />}
          <AccountFields />
          <Fields ctv={defaultName ? { name: defaultName } : undefined} />
          {defaultName && <p className="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Đây là dữ liệu CTV đã có từ trước. Anh/chị có thể đổi sang tên chính thức; khách, ca, lịch sử hoa hồng và giấy tờ cũ sẽ được giữ nguyên và liên kết vào hồ sơ này.</p>}
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditCollaboratorButton({ ctv, small }: { ctv: CtvProfile; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateCollaborator, () => setOpen(false));
  return (
    <>
      {small ? (
        <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title="Sửa hồ sơ CTV">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Sửa hồ sơ CTV
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={`Sửa hồ sơ — ${ctv.name}`} size="lg">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={ctv.id} />
          <Fields ctv={ctv} />
          <p className="-mt-2 text-xs text-slate-400">Mọi tháng trước sẽ đồng bộ thông tin hiển thị; số tiền và hoa hồng đã lưu không bị tính lại.</p>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
