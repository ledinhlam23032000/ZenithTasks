"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle, Check } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { buttonVariants } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { saveDebtThreshold } from "./actions";

type Consultant = { id: string; fullName: string };

/**
 * Thanh lọc Sổ công nợ: chọn tư vấn viên (điều hướng qua URL) + đặt NGƯỠNG cảnh
 * báo (LƯU vào DB nên giữ nguyên khi rời trang / đổi máy — trước đây chỉ nằm ở
 * URL nên bấm "Áp dụng" xong rời trang là mất).
 */
export function DebtFilters({
  consultants,
  tvFilter,
  bucket,
  threshold,
}: {
  consultants: Consultant[];
  tvFilter: string;
  bucket: string;
  threshold: number;
}) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(saveDebtThreshold);

  const goTv = (tv: string) => {
    const params = new URLSearchParams();
    if (bucket !== "all") params.set("bucket", bucket);
    if (tv) params.set("tv", tv);
    const q = params.toString();
    router.push(`/cong-no${q ? `?${q}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <select
        value={tvFilter}
        onChange={(e) => goTv(e.target.value)}
        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-brand-400 focus:outline-none"
      >
        <option value="">Mọi tư vấn viên</option>
        {consultants.map((c) => (
          <option key={c.id} value={c.id}>{c.fullName}</option>
        ))}
      </select>

      <form action={action} className="flex items-center gap-2">
        <span>Ngưỡng cảnh báo</span>
        <span className="w-32">
          <MoneyInput name="threshold" defaultValue={threshold} />
        </span>
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : state.ok ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
          Áp dụng
        </button>
        {state.error && <span className="text-rose-600">{state.error}</span>}
      </form>
    </div>
  );
}
