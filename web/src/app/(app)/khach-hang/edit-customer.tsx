"use client";

import { useState } from "react";
import { Pencil, LoaderCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/field";
import { SOURCE_LABEL, GENDER_LABEL } from "@/lib/status";
import { useFormAction } from "@/lib/use-form-action";
import { updateCustomer } from "./actions";
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
  allergies: string | null;
  medicalHistory: string | null;
  contraindications: string | null;
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
  const [state, action, pending] = useFormAction(updateCustomer, onDone);

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

      <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700">
          <ShieldAlert className="h-4 w-4" /> An toàn y khoa
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="e-allergies">Dị ứng</Label>
            <Textarea id="e-allergies" name="allergies" rows={2} defaultValue={customer.allergies ?? ""} placeholder="VD: dị ứng lidocaine, hải sản…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="e-history">Tiền sử bệnh / thuốc đang dùng</Label>
              <Textarea id="e-history" name="medicalHistory" rows={2} defaultValue={customer.medicalHistory ?? ""} placeholder="VD: tăng huyết áp, đang dùng thuốc chống đông…" />
            </div>
            <div>
              <Label htmlFor="e-contra">Chống chỉ định / lưu ý</Label>
              <Textarea id="e-contra" name="contraindications" rows={2} defaultValue={customer.contraindications ?? ""} placeholder="VD: đang mang thai, sẹo lồi…" />
            </div>
          </div>
        </div>
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
