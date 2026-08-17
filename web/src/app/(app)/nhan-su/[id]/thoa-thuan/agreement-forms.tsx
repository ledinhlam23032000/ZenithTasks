"use client";

import { useState } from "react";
import { Check, FilePlus2, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFormAction } from "@/lib/use-form-action";
import { createStaffAgreement, revokeStaffAgreement, signStaffAgreement, type AgreementState } from "./actions";

export function CreateAgreementButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useFormAction<AgreementState>(createStaffAgreement, () => { setOpen(false); window.location.reload(); });
  return <>
    <Button variant="secondary" onClick={() => setOpen(true)}><FilePlus2 className="h-4 w-4" /> Tạo bản thỏa thuận mới</Button>
    <Modal open={open} onClose={() => !pending && setOpen(false)} title="Tạo bản thỏa thuận nhân sự" size="lg">
      <form action={run} className="space-y-4"><input type="hidden" name="userId" value={userId} /><div><Label htmlFor="agreement-type">Loại thỏa thuận</Label><Select id="agreement-type" name="type" defaultValue="CONFIDENTIALITY"><option value="CONFIDENTIALITY">Bảo mật thông tin và bí mật kinh doanh</option><option value="NON_COMPETE">Không cạnh tranh và không lôi kéo</option></Select></div><div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Hệ thống lưu bản nháp theo version. Nội dung không cạnh tranh, thời hạn và mức phạt phải được luật sư/lao động rà soát trước khi ký chính thức.</div>{state.error && <p className="text-sm text-rose-600">{state.error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Tạo bản nháp</button></div></form>
    </Modal>
  </>;
}

export function SignAgreementButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useFormAction<AgreementState>(signStaffAgreement, () => { setOpen(false); window.location.reload(); });
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /> Đánh dấu đã ký</button>
    <Modal open={open} onClose={() => !pending && setOpen(false)} title="Xác nhận thỏa thuận đã ký" size="sm">
      <form action={run} className="space-y-4"><input type="hidden" name="id" value={id} /><p className="text-sm text-slate-600">Chỉ bấm sau khi hai bên đã ký bản giấy hoặc ký điện tử hợp lệ. Hệ thống sẽ lưu thời điểm và thời hạn làm snapshot quản lý.</p><div><Label htmlFor={`from-${id}`}>Ngày hiệu lực</Label><Input id={`from-${id}`} name="effectiveFrom" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div><div><Label htmlFor={`until-${id}`}>Ngày hết hạn (nếu có)</Label><Input id={`until-${id}`} name="effectiveUntil" type="date" /></div>{state.error && <p className="text-sm text-rose-600">{state.error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Xác nhận đã ký</button></div></form>
    </Modal>
  </>;
}

export function RevokeAgreementButton({ id }: { id: string }) {
  const [state, run, pending] = useFormAction<AgreementState>(revokeStaffAgreement, () => window.location.reload());
  return <form action={run} className="inline-flex"><input type="hidden" name="id" value={id} />{state.error && <span className="mr-1 text-xs text-rose-600">{state.error}</span>}<button type="submit" disabled={pending} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60">{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Thu hồi</button></form>;
}
