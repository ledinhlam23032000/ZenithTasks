"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, LoaderCircle, CheckCircle2, Wallet, Package, Camera, CalendarPlus, Pencil, Ticket } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { MoneyInput } from "@/components/ui/money-input";
import { formatVND } from "@/lib/money";
import { CASE_STATUS, CONSULT_RESULT, PAYMENT_LABEL } from "@/lib/status";
import {
  updateCaseInfo,
  addCaseService,
  addPayment,
  addMaterial,
  uploadPhoto,
  addFollowUp,
  updateCaseService,
  updatePayment,
  updateMaterialUsage,
  updateCaseVoucher,
  type CaseActionState,
} from "../actions";

type Svc = { id: string; name: string; listPrice: number; defaultPrice: number; category: string | null };
type Mat = { id: string; name: string; unit: string };
type Person = { id: string; fullName: string };

function Saved({ nonce }: { nonce?: number }) {
  if (!nonce) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu
    </span>
  );
}

// ===== Thông tin tư vấn =====
export function CaseInfoForm({
  caseId,
  consultants,
  doctors,
  initial,
}: {
  caseId: string;
  consultants: Person[];
  doctors: Person[];
  initial: {
    status: string;
    consultResult: string;
    consultantId: string | null;
    doctorId: string | null;
    commissionAmount: number;
    chiefComplaint: string | null;
    note: string | null;
  };
}) {
  const [state, action, pending] = useActionState<CaseActionState, FormData>(updateCaseInfo, {});
  const consultantOpts: ComboOption[] = [
    { value: "", label: "— Chưa phân công —" },
    ...consultants.map((c) => ({ value: c.id, label: c.fullName })),
  ];
  const doctorOpts: ComboOption[] = [
    { value: "", label: "— Chưa phân công —" },
    ...doctors.map((c) => ({ value: c.id, label: c.fullName })),
  ];
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Người tư vấn</Label>
          <Combobox name="consultantId" defaultValue={initial.consultantId ?? ""} options={consultantOpts} />
        </div>
        <div>
          <Label>Bác sĩ thực hiện</Label>
          <Combobox name="doctorId" defaultValue={initial.doctorId ?? ""} options={doctorOpts} />
        </div>
        <div>
          <Label htmlFor="consultResult">Kết quả tư vấn</Label>
          <Select id="consultResult" name="consultResult" defaultValue={initial.consultResult}>
            {Object.entries(CONSULT_RESULT).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Trạng thái hồ sơ</Label>
          <Select id="status" name="status" defaultValue={initial.status}>
            {Object.entries(CASE_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="commissionAmount">Hoa hồng cộng tác viên (VND)</Label>
        <MoneyInput id="commissionAmount" name="commissionAmount" defaultValue={initial.commissionAmount} />
      </div>
      <div>
        <Label htmlFor="chiefComplaint">Nhu cầu của khách</Label>
        <Input id="chiefComplaint" name="chiefComplaint" defaultValue={initial.chiefComplaint ?? ""} placeholder="VD: muốn nâng mũi, làm đẹp da…" />
      </div>
      <div>
        <Label htmlFor="note">Ghi chú chuyên môn</Label>
        <Textarea id="note" name="note" defaultValue={initial.note ?? ""} placeholder="Chẩn đoán, dặn dò, lưu ý…" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        <Saved nonce={state.nonce} />
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu thông tin
        </button>
      </div>
    </form>
  );
}

// ===== Thêm dịch vụ =====
export function AddServiceButton({ caseId, services }: { caseId: string; services: Svc[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm dịch vụ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm dịch vụ vào hồ sơ" size="lg">
        <ServiceForm caseId={caseId} services={services} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ServiceForm({ caseId, services, onDone }: { caseId: string; services: Svc[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<CaseActionState, FormData>(addCaseService, {});
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [listPrice, setListPrice] = useState(0);
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const finalPrice = Math.max(price * qty - discount, 0);
  const savings = Math.max((listPrice - price) * qty + discount, 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="name" value={name} />
      <div>
        <Label>Chọn dịch vụ (gõ để tìm)</Label>
        <Combobox
          value={serviceId}
          onChange={(v) => {
            const s = services.find((x) => x.id === v);
            setServiceId(v);
            if (s) {
              setName(s.name);
              // Giá gốc = giá niêm yết của danh mục; giá ưu đãi = giá thực thu mặc định.
              setListPrice(s.listPrice > 0 ? s.listPrice : s.defaultPrice);
              setPrice(s.defaultPrice);
            }
          }}
          placeholder="— Nhập thủ công —"
          options={[
            { value: "", label: "— Nhập thủ công —" },
            ...services.map((s) => ({ value: s.id, label: s.name, hint: s.category ?? undefined })),
          ]}
        />
      </div>
      <div>
        <Label htmlFor="svc-name">Tên dịch vụ *</Label>
        <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Tiêm filler má" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="listPrice">Giá gốc (VND)</Label>
          <MoneyInput id="listPrice" name="listPrice" value={listPrice} onValueChange={setListPrice} />
        </div>
        <div>
          <Label htmlFor="unitPrice">Giá ưu đãi (VND)</Label>
          <MoneyInput id="unitPrice" name="unitPrice" value={price} onValueChange={setPrice} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="quantity">Số lượng</Label>
          <Input id="quantity" name="quantity" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="discount">Giảm thêm (VND)</Label>
          <MoneyInput id="discount" name="discount" value={discount} onValueChange={setDiscount} />
        </div>
      </div>
      <div className="space-y-1 rounded-lg bg-brand-50 px-4 py-2.5">
        {savings > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span>Tiết kiệm cho khách</span>
            <span className="font-medium">−{formatVND(savings)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Thành tiền</span>
          <span className="text-lg font-semibold text-brand-700">{formatVND(finalPrice)}</span>
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Hủy</Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Thêm dịch vụ
        </button>
      </div>
    </form>
  );
}

// ===== Thêm thanh toán =====
export function AddPaymentButton({ caseId, debt }: { caseId: string; debt: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(addPayment, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4" /> Thu tiền
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận thanh toán">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div>
            <Label htmlFor="amount">Số tiền (VND) *</Label>
            <MoneyInput id="amount" name="amount" defaultValue={debt > 0 ? debt : 0} required autoFocus />
            {debt > 0 && <p className="mt-1 text-xs text-slate-400">Công nợ hiện tại: {formatVND(debt)}</p>}
          </div>
          <div>
            <Label htmlFor="method">Hình thức</Label>
            <Select id="method" name="method" defaultValue="CASH">
              {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="pay-note">Ghi chú</Label>
            <Input id="pay-note" name="note" placeholder="VD: đặt cọc, thanh toán đợt 1…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Xác nhận
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ===== Thêm vật tư =====
export function AddMaterialButton({ caseId, materials }: { caseId: string; materials: Mat[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(addMaterial, {});
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("cái");
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <Package className="h-4 w-4" /> Thêm vật tư
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận vật tư sử dụng">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="unit" value={unit} />
          <div>
            <Label>Chọn vật tư (gõ để tìm)</Label>
            <Combobox
              onChange={(v) => {
                const m = materials.find((x) => x.id === v);
                if (m) {
                  setName(m.name);
                  setUnit(m.unit);
                }
              }}
              placeholder="— Nhập thủ công —"
              options={[
                { value: "", label: "— Nhập thủ công —" },
                ...materials.map((m) => ({ value: m.id, label: m.name, hint: m.unit })),
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="mat-name">Tên vật tư *</Label>
              <Input id="mat-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="quantity">Số lượng *</Label>
              <Input id="quantity" name="quantity" type="number" step="0.01" min={0.01} defaultValue={1} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="mat-unit">Đơn vị</Label>
              <Input id="mat-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="mat-note">Ghi chú</Label>
              <Input id="mat-note" name="note" placeholder="Lô, hạn dùng…" />
            </div>
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Thêm
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ===== Tải ảnh =====
export function UploadPhotoButton({ caseId, customerId }: { caseId: string; customerId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(uploadPhoto, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4" /> Tải ảnh
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tải ảnh trước / sau / tái khám">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="customerId" value={customerId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">Loại ảnh</Label>
              <Select id="type" name="type" defaultValue="BEFORE">
                <option value="BEFORE">Ảnh trước làm</option>
                <option value="AFTER">Ảnh sau làm</option>
                <option value="FOLLOW_UP">Ảnh tái khám</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="followUpIndex">Lần tái khám (nếu có)</Label>
              <Input id="followUpIndex" name="followUpIndex" type="number" min={1} placeholder="VD: 1" />
            </div>
          </div>
          <div>
            <Label htmlFor="file">Chọn ảnh *</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div>
            <Label htmlFor="caption">Chú thích</Label>
            <Input id="caption" name="caption" placeholder="Góc chụp, ghi chú…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Tải lên
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ===== Hẹn tái khám =====
export function AddFollowUpButton({ caseId, customerId, defaultDateTime }: { caseId: string; customerId: string; defaultDateTime: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(addFollowUp, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Hẹn tái khám
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Hẹn lịch tái khám">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="customerId" value={customerId} />
          <div>
            <Label htmlFor="scheduledAt">Ngày giờ tái khám *</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={defaultDateTime} required />
          </div>
          <div>
            <Label htmlFor="fu-note">Ghi chú</Label>
            <Textarea id="fu-note" name="note" placeholder="Nội dung tái khám…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu lịch
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ===== Sửa dịch vụ trong hồ sơ =====
export function EditCaseServiceButton({
  caseId,
  service,
}: {
  caseId: string;
  service: { id: string; name: string; listPrice: number; unitPrice: number; quantity: number; discount: number };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(updateCaseService, {});
  const [name, setName] = useState(service.name);
  const [listPrice, setListPrice] = useState(service.listPrice);
  const [price, setPrice] = useState(service.unitPrice);
  const [qty, setQty] = useState(service.quantity);
  const [discount, setDiscount] = useState(service.discount);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  const finalPrice = Math.max(price * qty - discount, 0);
  const savings = Math.max((listPrice - price) * qty + discount, 0);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600" aria-label="Sửa" title="Sửa">
        <Pencil className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa dịch vụ" size="lg">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={service.id} />
          <input type="hidden" name="caseId" value={caseId} />
          <div>
            <Label htmlFor={`es-name-${service.id}`}>Tên dịch vụ *</Label>
            <Input id={`es-name-${service.id}`} name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Giá gốc (VND)</Label>
              <MoneyInput name="listPrice" value={listPrice} onValueChange={setListPrice} />
            </div>
            <div>
              <Label>Giá ưu đãi (VND)</Label>
              <MoneyInput name="unitPrice" value={price} onValueChange={setPrice} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`es-qty-${service.id}`}>Số lượng</Label>
              <Input id={`es-qty-${service.id}`} name="quantity" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div>
              <Label>Giảm thêm (VND)</Label>
              <MoneyInput name="discount" value={discount} onValueChange={setDiscount} />
            </div>
          </div>
          <div className="space-y-1 rounded-lg bg-brand-50 px-4 py-2.5">
            {savings > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>Tiết kiệm cho khách</span>
                <span className="font-medium">−{formatVND(savings)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Thành tiền</span>
              <span className="text-lg font-semibold text-brand-700">{formatVND(finalPrice)}</span>
            </div>
          </div>
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

// ===== Sửa khoản thu =====
export function EditPaymentButton({
  caseId,
  payment,
}: {
  caseId: string;
  payment: { id: string; amount: number; method: string; note: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(updatePayment, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-slate-300 hover:text-brand-600" aria-label="Sửa" title="Sửa">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa khoản thu">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={payment.id} />
          <input type="hidden" name="caseId" value={caseId} />
          <div>
            <Label>Số tiền (VND) *</Label>
            <MoneyInput name="amount" defaultValue={payment.amount} required autoFocus />
          </div>
          <div>
            <Label htmlFor={`ep-method-${payment.id}`}>Hình thức</Label>
            <Select id={`ep-method-${payment.id}`} name="method" defaultValue={payment.method}>
              {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`ep-note-${payment.id}`}>Ghi chú</Label>
            <Input id={`ep-note-${payment.id}`} name="note" defaultValue={payment.note} />
          </div>
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

// ===== Sửa vật tư trong hồ sơ =====
export function EditMaterialUsageButton({
  caseId,
  usage,
}: {
  caseId: string;
  usage: { id: string; name: string; unit: string; quantity: number; note: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(updateMaterialUsage, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600" aria-label="Sửa" title="Sửa">
        <Pencil className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa vật tư">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={usage.id} />
          <input type="hidden" name="caseId" value={caseId} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor={`emu-name-${usage.id}`}>Tên vật tư *</Label>
              <Input id={`emu-name-${usage.id}`} name="name" defaultValue={usage.name} required autoFocus />
            </div>
            <div>
              <Label htmlFor={`emu-qty-${usage.id}`}>Số lượng *</Label>
              <Input id={`emu-qty-${usage.id}`} name="quantity" type="number" step="0.01" min={0.01} defaultValue={usage.quantity} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor={`emu-unit-${usage.id}`}>Đơn vị</Label>
              <Input id={`emu-unit-${usage.id}`} name="unit" defaultValue={usage.unit} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`emu-note-${usage.id}`}>Ghi chú</Label>
              <Input id={`emu-note-${usage.id}`} name="note" defaultValue={usage.note} />
            </div>
          </div>
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

// ===== Voucher giảm thêm =====
export function EditVoucherButton({ caseId, voucher }: { caseId: string; voucher: { amount: number; code: string } }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CaseActionState, FormData>(updateCaseVoucher, {});
  const [kind, setKind] = useState<"VND" | "PCT">("VND");
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50"
        title="Voucher giảm thêm"
      >
        <Ticket className="h-3.5 w-3.5" /> {voucher.amount > 0 ? "Sửa voucher" : "Thêm voucher"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Voucher giảm thêm">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="voucherKind" value={kind} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("VND")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${kind === "VND" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}
            >
              Theo số tiền
            </button>
            <button
              type="button"
              onClick={() => setKind("PCT")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${kind === "PCT" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}
            >
              Theo phần trăm
            </button>
          </div>
          <div>
            <Label htmlFor="voucherValue">{kind === "PCT" ? "Phần trăm giảm (%)" : "Số tiền giảm (VND)"}</Label>
            {kind === "PCT" ? (
              <Input id="voucherValue" name="voucherValue" type="number" min={0} max={100} step={1} defaultValue={0} />
            ) : (
              <MoneyInput id="voucherValue" name="voucherValue" defaultValue={voucher.amount} />
            )}
          </div>
          <div>
            <Label htmlFor="voucherCode">Mã voucher (tuỳ chọn)</Label>
            <Input id="voucherCode" name="voucherCode" placeholder="VD: HE2025" defaultValue={voucher.code} />
          </div>
          <p className="text-xs text-slate-400">Để 0 nếu muốn bỏ voucher. Voucher giảm cả công nợ lẫn doanh thu tính hoa hồng.</p>
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
