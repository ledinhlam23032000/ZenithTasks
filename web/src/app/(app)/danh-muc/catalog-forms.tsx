"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, LoaderCircle, Pencil, Boxes, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Combobox } from "@/components/ui/combobox";
import { useFormAction } from "@/lib/use-form-action";
import {
  createService,
  createMaterial,
  updateService,
  updateMaterial,
  addServiceMaterial,
  removeServiceMaterial,
} from "./actions";

export function EditServiceButton({
  service,
}: {
  service: { id: string; name: string; category: string | null; listPrice: number; defaultPrice: number };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateService, () => setOpen(false));
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title="Sửa">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa dịch vụ">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={service.id} />
          <div>
            <Label htmlFor="es-name">Tên dịch vụ *</Label>
            <Input id="es-name" name="name" defaultValue={service.name} required autoFocus />
          </div>
          <div>
            <Label htmlFor="es-cat">Nhóm</Label>
            <Input id="es-cat" name="category" defaultValue={service.category ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="es-list">Giá niêm yết (VND)</Label>
              <MoneyInput id="es-list" name="listPrice" defaultValue={service.listPrice} />
            </div>
            <div>
              <Label htmlFor="es-price">Giá ưu đãi (VND)</Label>
              <MoneyInput id="es-price" name="defaultPrice" defaultValue={service.defaultPrice} />
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

export function EditMaterialButton({
  material,
}: {
  material: { id: string; name: string; unit: string; minStock: number; lotNo: string; expiryDate: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateMaterial, () => setOpen(false));
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title="Sửa">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa vật tư">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={material.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="em-name">Tên vật tư *</Label>
              <Input id="em-name" name="name" defaultValue={material.name} required autoFocus />
            </div>
            <div>
              <Label htmlFor="em-unit">Đơn vị</Label>
              <Input id="em-unit" name="unit" defaultValue={material.unit} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="em-min">Mức tồn tối thiểu</Label>
              <Input id="em-min" name="minStock" type="number" min={0} step="any" defaultValue={material.minStock} />
            </div>
            <div>
              <Label htmlFor="em-lot">Số lô</Label>
              <Input id="em-lot" name="lotNo" defaultValue={material.lotNo} placeholder="VD: LO2025A" />
            </div>
            <div>
              <Label htmlFor="em-exp">Hạn dùng</Label>
              <Input id="em-exp" name="expiryDate" type="date" defaultValue={material.expiryDate} />
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

type BomLineView = { id: string; materialId: string; name: string; unit: string; quantity: number };

/**
 * Trình sửa ĐỊNH MỨC VẬT TƯ cho một dịch vụ (BOM — B5 giai đoạn 2). Liệt kê các vật
 * tư tiêu hao mặc định cho 1 lần làm dịch vụ + cho thêm/sửa/xóa. Khi thêm dịch vụ vào
 * hồ sơ, nhân viên bấm "Trừ vật tư theo định mức" để tự ghi nhận + trừ kho theo bảng này.
 */
export function ServiceBomButton({
  service,
  materials,
}: {
  service: { id: string; name: string; lines: BomLineView[] };
  materials: { id: string; name: string; unit: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useFormAction(addServiceMaterial, () => setFormKey((k) => k + 1));
  const [removing, startRemove] = useTransition();

  const lines = service.lines;
  const options = materials.map((m) => ({ value: m.id, label: m.name, hint: m.unit }));

  function remove(id: string) {
    startRemove(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await removeServiceMaterial(fd);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
        title="Định mức vật tư"
      >
        <Boxes className="h-3.5 w-3.5" />
        {lines.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-500 px-0.5 text-[9px] font-semibold text-white">
            {lines.length}
          </span>
        )}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Định mức vật tư · ${service.name}`}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Khai báo vật tư tiêu hao mặc định cho <b>1 lần</b> làm dịch vụ này. Khi thêm dịch vụ vào hồ sơ, nhân viên
            bấm <b>“Trừ vật tư theo định mức”</b> để tự ghi nhận vật tư + trừ kho (theo số lượng dịch vụ).
          </p>

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
              Chưa có định mức. Thêm vật tư bên dưới.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{l.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums text-slate-500">
                      {l.quantity} {l.unit}/lần
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      disabled={removing}
                      className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                      title="Xóa định mức"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form action={action} className="space-y-3 border-t border-slate-100 pt-3">
            <input type="hidden" name="serviceId" value={service.id} />
            <div key={formKey} className="grid grid-cols-[1fr_auto] gap-2">
              <div>
                <Label htmlFor="bom-mat">Vật tư</Label>
                <Combobox name="materialId" options={options} placeholder="— Chọn vật tư —" />
              </div>
              <div className="w-24">
                <Label htmlFor="bom-qty">Định mức/lần</Label>
                <Input id="bom-qty" name="quantity" type="number" min={0} step="any" defaultValue={1} className="text-right" />
              </div>
            </div>
            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} <Plus className="h-4 w-4" /> Thêm vào định mức
              </button>
            </div>
          </form>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function NewServiceButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(createService, () => setOpen(false));
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm dịch vụ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm dịch vụ">
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="s-name">Tên dịch vụ *</Label>
            <Input id="s-name" name="name" placeholder="VD: Tiêm filler má baby" required autoFocus />
          </div>
          <div>
            <Label htmlFor="s-cat">Nhóm</Label>
            <Input id="s-cat" name="category" placeholder="VD: Tiêm chất làm đầy" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-list">Giá niêm yết (VND)</Label>
              <MoneyInput id="s-list" name="listPrice" />
            </div>
            <div>
              <Label htmlFor="s-price">Giá ưu đãi (VND)</Label>
              <MoneyInput id="s-price" name="defaultPrice" />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            VD: nâng mũi niêm yết 10.000.000, ưu đãi 6.000.000. Để trống giá niêm yết sẽ lấy bằng giá ưu đãi.
          </p>
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

export function NewMaterialButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(createMaterial, () => setOpen(false));
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm vật tư
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm vật tư">
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="m-name">Tên vật tư *</Label>
              <Input id="m-name" name="name" placeholder="VD: Filler Juvederm" required autoFocus />
            </div>
            <div>
              <Label htmlFor="m-unit">Đơn vị</Label>
              <Input id="m-unit" name="unit" defaultValue="cái" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="m-min">Mức tồn tối thiểu</Label>
              <Input id="m-min" name="minStock" type="number" min={0} step="any" defaultValue={0} />
            </div>
            <div>
              <Label htmlFor="m-lot">Số lô</Label>
              <Input id="m-lot" name="lotNo" placeholder="VD: LO2025A" />
            </div>
            <div>
              <Label htmlFor="m-exp">Hạn dùng</Label>
              <Input id="m-exp" name="expiryDate" type="date" />
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
