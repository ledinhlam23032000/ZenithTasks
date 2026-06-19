"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, LoaderCircle, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { createService, createMaterial, updateService, updateMaterial, type CatalogState } from "./actions";

export function EditServiceButton({ service }: { service: { id: string; name: string; category: string | null; defaultPrice: number } }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CatalogState, FormData>(updateService, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="es-cat">Nhóm</Label>
              <Input id="es-cat" name="category" defaultValue={service.category ?? ""} />
            </div>
            <div>
              <Label htmlFor="es-price">Giá mặc định (VND)</Label>
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
  const [state, action, pending] = useActionState<CatalogState, FormData>(updateMaterial, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
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

export function NewServiceButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CatalogState, FormData>(createService, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-cat">Nhóm</Label>
              <Input id="s-cat" name="category" placeholder="VD: Tiêm chất làm đầy" />
            </div>
            <div>
              <Label htmlFor="s-price">Giá mặc định (VND)</Label>
              <MoneyInput id="s-price" name="defaultPrice" />
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

export function NewMaterialButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CatalogState, FormData>(createMaterial, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);
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
