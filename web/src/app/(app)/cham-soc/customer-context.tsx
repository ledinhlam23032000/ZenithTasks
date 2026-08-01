"use client";

import Link from "next/link";
import { CheckCircle2, Link2, UserRound } from "lucide-react";
import { useFormAction } from "@/lib/use-form-action";
import { linkInboxCustomer, type InboxActionResult } from "./inbox-actions";

type CustomerOption = { id: string; code: string; fullName: string; phoneLast5: string };

export function CustomerContext({ conversationId, contactName, customer, customers, canLink }: {
  conversationId: string;
  contactName: string;
  customer: CustomerOption | null;
  customers: CustomerOption[];
  canLink: boolean;
}) {
  const [state, action, pending] = useFormAction<InboxActionResult>(async (_previous, data) => linkInboxCustomer(data));
  return <aside className="border-t border-slate-200 bg-slate-50/70 p-4 lg:border-l lg:border-t-0">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><UserRound className="h-4 w-4 text-brand-600" />Thông tin khách</div>
    <p className="mt-3 text-sm text-slate-500">Tên trên kênh</p><p className="font-medium text-slate-900">{contactName}</p>
    {customer ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Đã liên kết</p>
      <Link href={`/khach-hang/${customer.id}`} className="mt-2 block font-semibold text-slate-900 hover:text-brand-700">{customer.fullName}</Link>
      <p className="mt-1 text-xs text-slate-500">{customer.code} · ••• {customer.phoneLast5}</p>
    </div> : <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">Chưa liên kết hồ sơ</p><p className="mt-1 text-xs leading-5 text-amber-700">Chỉ liên kết sau khi nhân viên xác minh đúng khách, không đoán theo tên mạng xã hội.</p>
    </div>}
    {!customer && canLink && <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="customerId" className="text-xs font-medium text-slate-600">Chọn hồ sơ đã xác minh</label>
      <select id="customerId" name="customerId" required className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm">
        <option value="">— Chọn khách hàng —</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.code} · {item.phoneLast5}</option>)}
      </select>
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      <button disabled={pending} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-50"><Link2 className="h-4 w-4" />{pending ? "Đang liên kết…" : "Liên kết hồ sơ"}</button>
    </form>}
  </aside>;
}
