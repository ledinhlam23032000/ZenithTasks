"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createService, createMaterial, type CatalogState } from "./actions";

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
              <Input id="s-price" name="defaultPrice" type="number" min={0} defaultValue={0} />
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
