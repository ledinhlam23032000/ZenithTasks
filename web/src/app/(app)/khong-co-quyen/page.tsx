import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Không có quyền truy cập" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Bạn không có quyền truy cập mục này</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Mỗi nhân sự chỉ xem được phần công việc thuộc vai trò của mình. Vui lòng liên hệ quản trị viên nếu cần.
      </p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>
        Về trang tổng quan
      </Link>
    </div>
  );
}
