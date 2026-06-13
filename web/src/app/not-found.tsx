import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <Sparkles className="h-7 w-7" />
      </span>
      <p className="mt-6 text-5xl font-bold tracking-tight text-slate-800">404</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-700">Không tìm thấy trang</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Trang bạn tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>
        Về trang tổng quan
      </Link>
    </div>
  );
}
