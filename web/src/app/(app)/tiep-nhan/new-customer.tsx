"use client";

import { useState, useActionState } from "react";
import { UserPlus, LoaderCircle, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/field";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { SOURCE_LABEL, GENDER_LABEL } from "@/lib/status";
import { createCustomer, type CustomerFormState } from "./actions";

export type CollaboratorOption = { id: string; name: string };

export type CustomerPrefill = {
  fullName?: string;
  phone?: string;
  source?: string;
  sourceDetail?: string;
  collaboratorId?: string;
  note?: string;
};

export function NewCustomerButton({
  label = "Tạo hồ sơ khách mới",
  variant = "primary",
  prefill,
  collaborators = [],
}: {
  label?: string;
  variant?: "primary" | "secondary";
  prefill?: CustomerPrefill;
  collaborators?: CollaboratorOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Lập hồ sơ khách hàng"
        description="Nhập thông tin cơ bản. Sau khi lưu, hệ thống tự tạo hồ sơ tư vấn điện tử; số điện thoại được mã hoá và chỉ hiện 5 số cuối."
        size="lg"
      >
        <CustomerForm onCancel={() => setOpen(false)} prefill={prefill} collaborators={collaborators} />
      </Modal>
    </>
  );
}

function CustomerForm({ onCancel, prefill, collaborators }: { onCancel: () => void; prefill?: CustomerPrefill; collaborators: CollaboratorOption[] }) {
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(createCustomer, {});

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Họ và tên *</Label>
          <Input id="fullName" name="fullName" defaultValue={prefill?.fullName ?? ""} placeholder="Nguyễn Thị A" required autoFocus />
        </div>
        <div>
          <Label htmlFor="phone">Số điện thoại *</Label>
          <Input id="phone" name="phone" inputMode="tel" defaultValue={prefill?.phone ?? ""} placeholder="09xx xxx xxx" required />
          <FieldHint>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Mã hoá AES-256, chỉ hiển thị 5 số cuối về sau.
            </span>
          </FieldHint>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="gender">Giới tính</Label>
          <Select id="gender" name="gender" defaultValue="FEMALE">
            {Object.entries(GENDER_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dob">Ngày sinh</Label>
          <Input id="dob" name="dob" type="date" />
        </div>
        <div>
          <Label htmlFor="source">Nguồn khách</Label>
          <Select id="source" name="source" defaultValue={prefill?.source ?? "WALK_IN"}>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sourceDetail">Chi tiết nguồn / chiến dịch</Label>
            <Input id="sourceDetail" name="sourceDetail" defaultValue={prefill?.sourceDetail ?? ""} placeholder="VD: Chiến dịch Hè, Facebook Ads…" />
          </div>
          <div>
            <Label>Chọn cộng tác viên nếu nguồn là CTV</Label>
            <Combobox
              name="collaboratorId"
              defaultValue={prefill?.collaboratorId ?? ""}
              placeholder="— Không chọn CTV —"
              options={[{ value: "", label: "— Không chọn CTV —" }, ...collaborators.map((c): ComboOption => ({ value: c.id, label: c.name }))]}
            />
            <FieldHint>Không nhập tên CTV vào ô chi tiết nguồn; hệ thống sẽ tự đồng bộ theo ID.</FieldHint>
          </div>
        <div>
          <Label htmlFor="address">Địa chỉ</Label>
          <Input id="address" name="address" placeholder="Quận/Huyện, Tỉnh/TP" />
        </div>
      </div>

      <div>
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea id="note" name="note" defaultValue={prefill?.note ?? ""} placeholder="Tiền sử, lưu ý, mong muốn của khách…" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Hủy
        </Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {pending ? "Đang lưu…" : "Lưu & mở hồ sơ"}
        </button>
      </div>
    </form>
  );
}
