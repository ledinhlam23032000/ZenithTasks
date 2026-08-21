"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LoaderCircle, Plus, Minus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { savePermissions, type StaffFormState } from "./actions";
import type { Role } from "@/generated/prisma/client";
import { PERMISSION_PRESETS, permissionDiff, permissionPresetKeys } from "@/lib/permission-presets";

type Item = { key: string; label: string; group: string };
type Catalog = { modules: { key: string; label: string }[]; caps: { key: string; label: string; group: string }[] };

function PermissionColumn({
  title,
  list,
  member,
  tone,
  setMember,
}: {
  title: string;
  list: Item[];
  member: boolean;
  tone: string;
  setMember: (key: string, member: boolean) => void;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const k = e.dataTransfer.getData("text/plain");
        if (k) setMember(k, member);
      }}
      className={`min-h-[240px] flex-1 rounded-xl border p-2 ${tone}`}
    >
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title} ({list.length})
      </p>
      <div className="space-y-1.5">
        {list.map((i) => (
          <div
            key={i.key}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", i.key)}
            onClick={() => setMember(i.key, !member)}
            className="flex cursor-grab items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 hover:border-brand-300 active:cursor-grabbing"
            title="Kéo thả hoặc bấm để chuyển cột"
          >
            <span>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{i.group}</span>
              {i.label}
            </span>
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
  role,
  catalog,
}: {
  userId: string;
  name: string;
  granted: string[];
  role: Role;
  catalog: Catalog;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<StaffFormState, FormData>(savePermissions, {});
  const [on, setOn] = useState<Set<string>>(new Set(granted));

  const items: Item[] = useMemo(
    () => [
      ...catalog.modules.map((m) => ({ key: m.key, label: m.label, group: "Truy cập mục" })),
      ...catalog.caps.map((c) => ({ key: c.key, label: c.label, group: c.group })),
    ],
    [catalog],
  );

  useEffect(() => {
    if (!state.ok) return;
    // savePermissions không gọi revalidatePath (đúng quy ước) nên phải tự làm
    // mới trang ở đây — nếu không, danh sách nhân sự vẫn hiện quyền cũ cho
    // tới khi tải lại tay, dễ khiến admin tưởng chưa lưu và bấm lại nhiều lần.
    router.refresh();
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [state.ok, router]);

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
  const sensitiveKeys = new Set(["phone.full", "payment.manage", "accounting.pay", "case.clinical"]);
  const sensitiveOn = [...on].filter((key) => sensitiveKeys.has(key));
  const initialDiff = permissionDiff(granted, on);


  return (
    <>
      <button
        onClick={() => {
          setOn(new Set(granted));
          setOpen(true);
        }}
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
          <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-2.5 text-xs text-brand-800">
            <p className="font-semibold">Preset theo chức danh</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PERMISSION_PRESETS.map((preset) => (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => setOn(new Set(permissionPresetKeys(preset.role)))}
                  className={`rounded-md border px-2 py-1 font-medium ${preset.role === role ? "border-brand-300 bg-white text-brand-700" : "border-brand-100 bg-brand-50 text-brand-700 hover:bg-white"}`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-brand-700/80">Preset chỉ điền bản preview. Quản trị viên vẫn là người duy nhất bấm Lưu và hệ thống không vượt hard barrier CTV/cổ đông.</p>
          </div>
          <p className="text-xs text-slate-500">
            <b>Kéo thả</b> (hoặc bấm) để chuyển quyền giữa hai cột. Cột <b className="text-emerald-700">ĐANG BẬT</b> là những quyền nhân sự này được dùng.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PermissionColumn title="Đang tắt" list={offItems} member={false} tone="border-slate-100 bg-slate-50/60" setMember={setMember} />
            <PermissionColumn title="Đang bật" list={onItems} member={true} tone="border-emerald-200 bg-emerald-50/40" setMember={setMember} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Preview thay đổi</p>
            <p className="mt-1">Mở thêm: {initialDiff.added.length} · Tắt: {initialDiff.removed.length}</p>
            {sensitiveOn.length > 0 && <p className="mt-1 text-amber-700">Quyền nhạy cảm đang bật: {sensitiveOn.join(", ")}</p>}
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
