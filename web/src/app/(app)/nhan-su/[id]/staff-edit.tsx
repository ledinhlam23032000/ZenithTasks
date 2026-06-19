"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ROLE_LABELS } from "@/lib/rbac";
import { updateStaff, type StaffFormState } from "../actions";
import type { Role } from "@/generated/prisma/client";

export type EditableStaff = {
  id: string;
  fullName: string;
  role: Role;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  hometown: string;
  nationalId: string;
  bankAccount: string;
  bankName: string;
  bankHolder: string;
  emergencyName: string;
  emergencyPhone: string;
  position: string;
  department: string;
  hireDate: string;
  qualification: string;
  notes: string;
  baseSalary: number;
  commissionRate: number;
};

export function EditStaffButton({ staff }: { staff: EditableStaff }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<StaffFormState, FormData>(updateStaff, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Sửa hồ sơ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Sửa hồ sơ — ${staff.fullName}`} size="lg">
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={staff.id} />

          <Section title="Thông tin chung">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên *"><Input name="fullName" defaultValue={staff.fullName} required /></Field>
              <Field label="Vai trò">
                <Select name="role" defaultValue={staff.role}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="SĐT nội bộ"><Input name="phone" inputMode="tel" defaultValue={staff.phone} /></Field>
              <Field label="Chức danh"><Input name="position" defaultValue={staff.position} placeholder="VD: Bác sĩ chính" /></Field>
            </div>
          </Section>

          <Section title="Cá nhân">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Ngày sinh"><Input type="date" name="dob" defaultValue={staff.dob} /></Field>
              <Field label="Giới tính">
                <Select name="gender" defaultValue={staff.gender}>
                  <option value="">—</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </Select>
              </Field>
              <Field label="CCCD / CMND"><Input name="nationalId" defaultValue={staff.nationalId} /></Field>
              <Field label="Quê quán"><Input name="hometown" defaultValue={staff.hometown} /></Field>
              <div className="sm:col-span-2">
                <Field label="Địa chỉ"><Input name="address" defaultValue={staff.address} /></Field>
              </div>
            </div>
          </Section>

          <Section title="Liên hệ khẩn cấp">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Người liên hệ"><Input name="emergencyName" defaultValue={staff.emergencyName} /></Field>
              <Field label="SĐT khẩn cấp"><Input name="emergencyPhone" inputMode="tel" defaultValue={staff.emergencyPhone} /></Field>
            </div>
          </Section>

          <Section title="Tài khoản ngân hàng">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Số tài khoản"><Input name="bankAccount" defaultValue={staff.bankAccount} /></Field>
              <Field label="Ngân hàng"><Input name="bankName" defaultValue={staff.bankName} /></Field>
              <Field label="Chủ tài khoản"><Input name="bankHolder" defaultValue={staff.bankHolder} /></Field>
            </div>
          </Section>

          <Section title="Công việc & lương">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phòng / bộ phận"><Input name="department" defaultValue={staff.department} /></Field>
              <Field label="Ngày vào làm"><Input type="date" name="hireDate" defaultValue={staff.hireDate} /></Field>
              <Field label="Lương cứng (VND/tháng)"><MoneyInput name="baseSalary" defaultValue={staff.baseSalary} /></Field>
              <Field label="Hoa hồng (%)"><Input name="commissionRate" type="number" min={0} max={100} step={0.5} defaultValue={staff.commissionRate} /></Field>
              <div className="sm:col-span-2">
                <Field label="Bằng cấp / chứng chỉ"><Input name="qualification" defaultValue={staff.qualification} /></Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Ghi chú nội bộ"><Textarea name="notes" defaultValue={staff.notes} /></Field>
              </div>
            </div>
          </Section>

          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu hồ sơ
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
