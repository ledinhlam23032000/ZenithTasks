"use client";

import { useState, useActionState, useEffect } from "react";
import { Pencil, LoaderCircle, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/field";
import { SOURCE_LABEL, GENDER_LABEL } from "@/lib/status";
import { updateCustomer, type EditCustomerState } from "./actions";
import type { Gender, CustomerSource } from "@/generated/prisma/client";

export type EditableCustomer = {
  id: string;
  fullName: string;
  gender: Gender | null;
  dob: string | null; // yyyy-MM-dd
  source: CustomerSource;
  sourceDetail: string | null;
  address: string | null;
  note: string | null;
  phoneLast5: string;
};

export function EditCustomerButton({ customer }: { customer: EditableCustomer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Sửa thông tin
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cập nhật hồ sơ khách hàng" size="lg">
        <EditForm customer={customer} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function EditForm({ customer, onDone }: { customer: EditableCustomer; onDone: () => void }) {
  const [state, action, pending] = useActionState<EditCustomerState, FormData>(updateCustomer, {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="customerId" value={customer.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="e-fullName">Họ và tên *</Label>
          <Input id="e-fullName" name="fullName" defaultValue={customer.fullName} required autoFocus />
        </div>
        <div>
          <Label htmlFor="e-phone">Đổi số điện thoại</Label>
          <Input id="e-phone" name="phone" inputMode="tel" placeholder={`Hiện tại: ••• ${customer.phoneLast5}`} />
          <FieldHint>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Để trống nếu không đổi. Số cũ luôn được ẩn.
            </span>
          </FieldHint>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="e-gender">Giới tính</Label>
          <Select id="e-gender" name="gender" defaultValue={customer.gender ?? ""}>
            <option value="">—</option>
            {Object.entries(GENDER_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="e-dob">Ngày sinh</Label>
          <Input id="e-dob" name="dob" type="date" defaultValue={customer.dob ?? ""} />
        </div>
        <div>
          <Label htmlFor="e-source">Nguồn khách</Label>
          <Select id="e-source" name="source" defaultValue={customer.source}>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="e-sourceDetail">Chi tiết nguồn</Label>
          <Input id="e-sourceDetail" name="sourceDetail" defaultValue={customer.sourceDetail ?? ""} />
        </div>
        <div>
          <Label htmlFor="e-address">Địa chỉ</Label>
          <Input id="e-address" name="address" defaultValue={customer.address ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="e-note">Ghi chú</Label>
        <Textarea id="e-note" name="note" defaultValue={customer.note ?? ""} />
      </div>

      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Hủy</Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu thay đổi
        </button>
      </div>
    </form>
  );
}
