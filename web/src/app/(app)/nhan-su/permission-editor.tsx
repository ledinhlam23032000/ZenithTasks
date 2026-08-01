"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, LoaderCircle, Plus, Minus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { savePermissions, type StaffFormState } from "./actions";

type Item = { key: string; label: string; group: string };
type Catalog = { modules: { key: string; label: string }[]; caps: { key: string; label: string; group: string }[] };

function PermissionColumn({ title, list, member, tone, onMove }: { title: string; list: Item[]; member: boolean; tone: string; onMove: (key: string, member: boolean) => void }) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const key = event.dataTransfer.getData("text/plain");
        if (key) onMove(key, member);
      }}
      className={`min-h-[240px] flex-1 rounded-xl border p-2 ${tone}`}
    >
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title} ({list.length})</p>
      <div className="space-y-1.5">
        {list.map((item) => (
          <div
            key={item.key}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", item.key)}
            onClick={() => onMove(item.key, !member)}
            className="flex cursor-grab items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 hover:border-brand-300 active:cursor-grabbing"
            title="Kéo thả hoặc bấm để chuyển cột"
          >
            <span><span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{item.group}</span>{item.label}</span>
            {member ? <Minus className="h-3.5 w-3.5 shrink-0 text-rose-400" /> : <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          </div>
        ))}
        {list.length === 0 && <p className="px-1 py-8 text-center text-xs text-slate-300">Kéo quyền vào đây</p>}
      </div>
    </div>
  );
}

export function PermissionEditorButton({
  userId,
  name,
  granted,
  catalog,
}: {
  userId: string;
  name: string;
  granted: string[];
  catalog: Catalog;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction<StaffFormState>(savePermissions, () => setOpen(false));
  const [on, setOn] = useState<Set<string>>(new Set(granted));

  const items: Item[] = useMemo(
    () => [
      ...catalog.modules.map((m) => ({ key: m.key, label: m.label, group: "Truy cập mục" })),
      ...catalog.caps.map((c) => ({ key: c.key, label: c.label, group: c.group })),
    ],
    [catalog],
  );

  function setMember(key: string, member: boolean) {
    setOn((prev) => {
      const n = new Set(prev);
      if (member) n.add(key);
      else n.delete(key);
      return n;
    });
  }

  const onItems = items.filter((i) => on.has(i.key));
  const offItems = items.filter((i) => !on.has(i.key));

  return (
    <>
      <button
        onClick={() => { setOn(new Set(granted)); setOpen(true); }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
        title="Phân quyền"
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Phân quyền
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Phân quyền — ${name}`} size="lg">
        <form action={action} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          {[...on].map((k) => (
            <input key={k} type="hidden" name="key" value={k} />
          ))}
          <p className="text-xs text-slate-500">
            <b>Kéo thả</b> (hoặc bấm) để chuyển quyền giữa hai cột. Cột <b className="text-emerald-700">ĐANG BẬT</b> là những quyền nhân sự này được dùng.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PermissionColumn title="Đang tắt" list={offItems} member={false} tone="border-slate-100 bg-slate-50/60" onMove={setMember} />
            <PermissionColumn title="Đang bật" list={onItems} member={true} tone="border-emerald-200 bg-emerald-50/40" onMove={setMember} />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu quyền
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
