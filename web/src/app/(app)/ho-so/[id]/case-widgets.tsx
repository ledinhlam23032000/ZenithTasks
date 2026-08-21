"use client";

import { useState } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { Plus, LoaderCircle, CheckCircle2, Wallet, Package, Camera, CalendarPlus, Pencil, Ticket, CalendarCog } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { MoneyInput } from "@/components/ui/money-input";
import { formatVND } from "@/lib/money";
import { compressImage } from "@/lib/compress-image";
import { CASE_STATUS, CONSULT_RESULT, PAYMENT_LABEL } from "@/lib/status";
import { CONSULTATION_SCREENING_ITEMS, defaultScreening, normalizeScreening, type ScreeningMap } from "@/lib/consultation-sheet";
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
  updateCaseDate,
  saveConsultationRecord,
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
  const [state, action, pending] = useFormAction(updateCaseInfo);
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

type ConsultationInitial = {
  weightKg: number | null;
  heightCm: number | null;
  bloodType: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  pulse: number | null;
  bloodPressure: string | null;
  temperatureC: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  screening: unknown;
  patientConfirmed: boolean;
  wants: string | null;
  currentCondition: string | null;
  expectedResult: string | null;
  doctorIndication: string | null;
  updatedAt: string | null;
};

export function ConsultationBookForm({ caseId, initial }: { caseId: string; initial: ConsultationInitial | null }) {
  const [state, action, pending] = useFormAction(saveConsultationRecord);
  const [screening, setScreening] = useState<ScreeningMap>(() => normalizeScreening(initial?.screening ?? defaultScreening()));
  const toggleAll = (abnormal: boolean) => setScreening(Object.fromEntries(CONSULTATION_SCREENING_ITEMS.map(({ key }) => [key, { abnormal, note: "" }])) as ScreeningMap);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="screeningJson" value={JSON.stringify(screening)} />
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3 text-xs text-slate-600">
        <strong>Hồ sơ dịch vụ thẩm mỹ:</strong> các thông tin đã nhập được lưu theo hồ sơ. Có thể sửa trong 24 giờ; sau đó chỉ ADMIN sửa bổ sung. Nút dưới chỉ đánh dấu nhanh “không ghi nhận bất thường”, không thay cho đánh giá chuyên môn của bác sĩ.
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">I. Thông tin hành chính bổ sung</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="weightKg">Cân nặng (kg)</Label><Input id="weightKg" name="weightKg" type="number" step="0.1" defaultValue={initial?.weightKg ?? ""} /></div>
          <div><Label htmlFor="heightCm">Chiều cao (cm)</Label><Input id="heightCm" name="heightCm" type="number" step="0.1" defaultValue={initial?.heightCm ?? ""} /></div>
          <div><Label htmlFor="bloodType">Nhóm máu</Label><Input id="bloodType" name="bloodType" defaultValue={initial?.bloodType ?? ""} /></div>
          <div><Label htmlFor="emergencyName">Người liên hệ khi cần</Label><Input id="emergencyName" name="emergencyName" defaultValue={initial?.emergencyName ?? ""} /></div>
        </div>
        <div className="mt-3"><Label htmlFor="emergencyPhone">SĐT người liên hệ khi cần</Label><Input id="emergencyPhone" name="emergencyPhone" defaultValue={initial?.emergencyPhone ?? ""} /></div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">II. Dấu hiệu sinh tồn</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><Label htmlFor="pulse">Mạch/phút</Label><Input id="pulse" name="pulse" type="number" defaultValue={initial?.pulse ?? ""} /></div>
          <div><Label htmlFor="bloodPressure">Huyết áp</Label><Input id="bloodPressure" name="bloodPressure" placeholder="120/80" defaultValue={initial?.bloodPressure ?? ""} /></div>
          <div><Label htmlFor="temperatureC">Nhiệt độ °C</Label><Input id="temperatureC" name="temperatureC" type="number" step="0.1" defaultValue={initial?.temperatureC ?? ""} /></div>
          <div><Label htmlFor="respiratoryRate">Nhịp thở/phút</Label><Input id="respiratoryRate" name="respiratoryRate" type="number" defaultValue={initial?.respiratoryRate ?? ""} /></div>
          <div><Label htmlFor="spo2">SpO2 %</Label><Input id="spo2" name="spo2" type="number" defaultValue={initial?.spo2 ?? ""} /></div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">III. Bảng câu hỏi sàng lọc y tế</p><div className="flex gap-2"><button type="button" onClick={() => toggleAll(false)} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Mặc định: Bình thường</button><button type="button" onClick={() => toggleAll(true)} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Đánh dấu bất thường</button></div></div>
        <div className="overflow-x-auto rounded-lg border border-slate-100"><table className="min-w-[720px] w-full text-xs"><thead><tr className="bg-slate-50 text-left text-slate-500"><th className="w-8 px-2 py-2">#</th><th className="px-2 py-2">Nội dung sàng lọc</th><th className="w-20 px-2 py-2 text-center">Bình thường</th><th className="w-20 px-2 py-2 text-center">Bất thường</th><th className="w-64 px-2 py-2">Ghi chú nếu bất thường</th></tr></thead><tbody>{CONSULTATION_SCREENING_ITEMS.map(({ key, label }, index) => { const entry = screening[key] ?? { abnormal: false, note: "" }; return <tr key={key} className="border-t border-slate-100 align-top"><td className="px-2 py-2 text-slate-400">{index + 1}</td><td className="px-2 py-2 text-slate-700">{label}</td><td className="px-2 py-2 text-center"><input aria-label={`${label}: Bình thường`} type="radio" name={`screening-${index}`} checked={!entry.abnormal} onChange={() => setScreening((prev) => ({ ...prev, [key]: { ...entry, abnormal: false } }))} /></td><td className="px-2 py-2 text-center"><input aria-label={`${label}: Bất thường`} type="radio" name={`screening-${index}`} checked={entry.abnormal} onChange={() => setScreening((prev) => ({ ...prev, [key]: { ...entry, abnormal: true } }))} /></td><td className="px-2 py-2"><Input aria-label={`${label}: Ghi chú`} value={entry.note} onChange={(event) => setScreening((prev) => ({ ...prev, [key]: { ...entry, note: event.target.value } }))} placeholder="Mức độ, thời gian, thuốc…" /></td></tr>; })}</tbody></table></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="wants">Mong muốn của khách</Label><Textarea id="wants" name="wants" defaultValue={initial?.wants ?? ""} /></div><div><Label htmlFor="currentCondition">Tình trạng hiện tại</Label><Textarea id="currentCondition" name="currentCondition" defaultValue={initial?.currentCondition ?? ""} /></div><div><Label htmlFor="expectedResult">Kết quả dự tính</Label><Textarea id="expectedResult" name="expectedResult" defaultValue={initial?.expectedResult ?? ""} /></div><div><Label htmlFor="doctorIndication">Chỉ định của bác sĩ</Label><Textarea id="doctorIndication" name="doctorIndication" defaultValue={initial?.doctorIndication ?? ""} /></div></div>
      <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><input type="checkbox" name="patientConfirmed" defaultChecked={initial?.patientConfirmed ?? false} /> Khách đã xác nhận thông tin sàng lọc là đúng theo mẫu đã cung cấp.</label>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3"><Saved nonce={state.nonce} /><a href={`/ho-so/${caseId}/consultation`} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Xem / In Hồ sơ dịch vụ thẩm mỹ</a><button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu sổ tư vấn</button></div>
    </form>
  );
}

// ===== Thêm dịch vụ =====
export function AddServiceButton({ caseId, services, nurses }: { caseId: string; services: Svc[]; nurses: Person[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm dịch vụ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm dịch vụ vào hồ sơ" size="lg">
        <ServiceForm caseId={caseId} services={services} nurses={nurses} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ServiceForm({ caseId, services, nurses, onDone }: { caseId: string; services: Svc[]; nurses: Person[]; onDone: () => void }) {
  const [state, action, pending] = useFormAction(addCaseService, onDone);
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [listPrice, setListPrice] = useState(0);
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [nurseId, setNurseId] = useState("");

  const finalPrice = Math.max(price * qty - discount, 0);
  const savings = Math.max((listPrice - price) * qty + discount, 0);
  const nurseOpts: ComboOption[] = [
    { value: "", label: "— Chưa phân công —" },
    ...nurses.map((n) => ({ value: n.id, label: n.fullName })),
  ];

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
      <div>
        <Label>Điều dưỡng phụ trách</Label>
        <input type="hidden" name="nurseId" value={nurseId} />
        <Combobox value={nurseId} onChange={setNurseId} options={nurseOpts} placeholder="— Chưa phân công —" />
        <p className="mt-1 text-xs text-slate-400">Căn cứ tính tiền dịch vụ phụ (100k/ca) cho điều dưỡng.</p>
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
  const [clientNonce, setClientNonce] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useFormAction(addPayment, () => setOpen(false));
  return (
    <>
      <Button size="sm" onClick={() => { setClientNonce(crypto.randomUUID()); setOpen(true); }}>
        <Wallet className="h-4 w-4" /> Thu tiền
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận thanh toán">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="clientNonce" value={clientNonce} />
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
  const [state, action, pending] = useFormAction(addMaterial, () => setOpen(false));
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("cái");
  // materialId = vật tư trong danh mục kho (để TRỪ TỒN). Rỗng = nhập tay, không trừ kho.
  const [materialId, setMaterialId] = useState("");
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
          <input type="hidden" name="materialId" value={materialId} />
          <div>
            <Label>Chọn vật tư (gõ để tìm)</Label>
            <Combobox
              onChange={(v) => {
                setMaterialId(v);
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
            {materialId ? (
              <p className="mt-1 text-xs text-emerald-600">Sẽ tự trừ tồn kho khi lưu.</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Nhập tay (không có trong kho) sẽ không trừ tồn.</p>
            )}
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
  const [busy, setBusy] = useState(false);
  const [state, action, pending] = useFormAction(uploadPhoto, () => setOpen(false));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      setBusy(true);
      try {
        fd.set("file", await compressImage(file));
      } finally {
        setBusy(false);
      }
    }
    action(fd);
  }

  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4" /> Tải ảnh
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tải ảnh (trước / sau / tái khám / cận lâm sàng)">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="customerId" value={customerId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type">Loại ảnh</Label>
              <Select id="type" name="type" defaultValue="BEFORE">
                <option value="BEFORE">Ảnh trước làm</option>
                <option value="AFTER">Ảnh sau làm</option>
                <option value="FOLLOW_UP">Ảnh tái khám</option>
                <option value="CLINICAL">Cận lâm sàng (X-quang/CT/siêu âm)</option>
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
            <p className="mt-1 text-xs text-slate-400">Ảnh được nén tự động cho nhẹ trước khi tải lên (nhanh hơn).</p>
          </div>
          <div>
            <Label htmlFor="caption">Chú thích</Label>
            <Input id="caption" name="caption" placeholder="Góc chụp, vùng chụp, ghi chú…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending || busy} className={buttonVariants()}>
              {(pending || busy) && <LoaderCircle className="h-4 w-4 animate-spin" />} {busy ? "Đang nén ảnh…" : "Tải lên"}
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
  const [state, action, pending] = useFormAction(addFollowUp, () => setOpen(false));
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
  nurses,
}: {
  caseId: string;
  service: { id: string; name: string; listPrice: number; unitPrice: number; quantity: number; discount: number; nurseId: string | null };
  nurses: Person[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateCaseService, () => setOpen(false));
  const [name, setName] = useState(service.name);
  const [listPrice, setListPrice] = useState(service.listPrice);
  const [price, setPrice] = useState(service.unitPrice);
  const [qty, setQty] = useState(service.quantity);
  const [discount, setDiscount] = useState(service.discount);
  const [nurseId, setNurseId] = useState(service.nurseId ?? "");
  const finalPrice = Math.max(price * qty - discount, 0);
  const savings = Math.max((listPrice - price) * qty + discount, 0);
  const nurseOpts: ComboOption[] = [
    { value: "", label: "— Chưa phân công —" },
    ...nurses.map((n) => ({ value: n.id, label: n.fullName })),
  ];
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
          <div>
            <Label>Điều dưỡng phụ trách</Label>
            <input type="hidden" name="nurseId" value={nurseId} />
            <Combobox value={nurseId} onChange={setNurseId} options={nurseOpts} placeholder="— Chưa phân công —" />
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
  isAdmin,
}: {
  caseId: string;
  payment: { id: string; amount: number; method: string; note: string; paidAt: string };
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updatePayment, () => setOpen(false));
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
          {isAdmin && (
            <div>
              <Label htmlFor={`ep-date-${payment.id}`}>Ngày thu tiền</Label>
              <Input id={`ep-date-${payment.id}`} name="paidAt" type="datetime-local" defaultValue={payment.paidAt} />
              <p className="mt-1 text-xs text-slate-400">Chỉ quản trị viên — sửa để cập nhật số liệu cũ cho báo cáo đúng kỳ.</p>
            </div>
          )}
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
  const [state, action, pending] = useFormAction(updateMaterialUsage, () => setOpen(false));
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
  const [state, action, pending] = useFormAction(updateCaseVoucher, () => setOpen(false));
  const [kind, setKind] = useState<"VND" | "PCT">("VND");
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

// ===== Sửa NGÀY TẠO hồ sơ (chỉ quản trị) =====
export function EditCaseDateButton({ caseId, createdAt }: { caseId: string; createdAt: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateCaseDate, () => setOpen(false));
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
        title="Sửa ngày tạo hồ sơ"
      >
        <CalendarCog className="h-3.5 w-3.5" /> Sửa ngày tạo
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa ngày tạo hồ sơ" description="Dùng khi tạo hồ sơ sau ngày khách thực đến. Chỉ quản trị viên.">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div>
            <Label htmlFor="cd-date">Ngày & giờ tạo</Label>
            <Input id="cd-date" name="createdAt" type="datetime-local" defaultValue={createdAt} required autoFocus />
          </div>
          <p className="text-xs text-slate-400">Lưu ý: thay đổi ảnh hưởng tới báo cáo & lương theo tháng (vì tính theo ngày tạo hồ sơ).</p>
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
