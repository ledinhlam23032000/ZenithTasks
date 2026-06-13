"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, LoaderCircle, CheckCircle2, Wallet, Package, Camera, CalendarPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { formatVND } from "@/lib/money";
import { CASE_STATUS, CONSULT_RESULT, PAYMENT_LABEL } from "@/lib/status";
import {
  updateCaseInfo,
  addCaseService,
  addPayment,
  addMaterial,
  uploadPhoto,
  addFollowUp,
  type CaseActionState,
} from "../actions";

type Svc = { id: string; name: string; defaultPrice: number; category: string | null };
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
    chiefComplaint: string | null;
    note: string | null;
  };
}) {
  const [state, action, pending] = useActionState<CaseActionState, FormData>(updateCaseInfo, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="consultantId">Tư vấn viên</Label>
          <Select id="consultantId" name="consultantId" defaultValue={initial.consultantId ?? ""}>
            <option value="">— Chưa phân công —</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="doctorId">Bác sĩ thực hiện</Label>
          <Select id="doctorId" name="doctorId" defaultValue={initial.doctorId ?? ""}>
            <option value="">— Chưa phân công —</option>
            {doctors.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </Select>
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
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const finalPrice = Math.max(price * qty - discount, 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="name" value={name} />
      <div>
        <Label>Chọn dịch vụ</Label>
        <Select
          value={serviceId}
          onChange={(e) => {
            const s = services.find((x) => x.id === e.target.value);
            setServiceId(e.target.value);
            if (s) {
              setName(s.name);
              setPrice(s.defaultPrice);
            }
          }}
        >
          <option value="">— Nhập thủ công —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.category ? ` (${s.category})` : ""}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="svc-name">Tên dịch vụ *</Label>
        <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Tiêm filler má" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="unitPrice">Đơn giá (VND)</Label>
          <Input id="unitPrice" name="unitPrice" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="quantity">Số lượng</Label>
          <Input id="quantity" name="quantity" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="discount">Giảm giá (VND)</Label>
          <Input id="discount" name="discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-2.5">
        <span className="text-sm text-slate-600">Thành tiền</span>
        <span className="text-lg font-semibold text-brand-700">{formatVND(finalPrice)}</span>
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
            <Input id="amount" name="amount" type="number" min={1} defaultValue={debt > 0 ? debt : ""} placeholder="0" required autoFocus />
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
            <Label>Chọn vật tư</Label>
            <Select
              defaultValue=""
              onChange={(e) => {
                const m = materials.find((x) => x.id === e.target.value);
                if (m) {
                  setName(m.name);
                  setUnit(m.unit);
                }
              }}
            >
              <option value="">— Nhập thủ công —</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </Select>
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
