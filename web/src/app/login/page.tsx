import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, CalendarClock, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Bảng thương hiệu */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-400/20 blur-2xl" />

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-balance">
            Trung tâm Phẫu thuật Tạo hình Thẩm mỹ
          </h2>
          <p className="mt-2 text-sm font-medium text-white/80">Bệnh viện Đa khoa Hồng Phúc</p>
          <p className="mt-3 text-white/75">
            Ứng dụng nội bộ quản trị. Lịch hẹn, hồ sơ khách, tài chính, kho, lương và báo cáo trong một hệ thống.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-brand-200" /> Lịch hẹn &amp; tiếp nhận khách theo thời gian thực
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-brand-200" /> Bảo mật số điện thoại khách — ẩn 100%
            </li>
            <li className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-brand-200" /> Báo cáo doanh thu &amp; hiệu suất nhân viên
            </li>
          </ul>
        </div>

        <div className="relative text-xs text-white/60">
          <p>Thiết kế &amp; vận hành: GĐĐH — BS. Lê Đình Lam</p>
          <p>Hỗ trợ sự cố: 0941 567 496</p>
        </div>
      </div>

      {/* Form đăng nhập */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-xl font-bold text-brand-700">Trung tâm Phẫu thuật Tạo hình Thẩm mỹ</p>
            <p className="text-xs text-slate-500">Bệnh viện Đa khoa Hồng Phúc</p>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">Đăng nhập</h1>
          <p className="mt-1 text-sm text-slate-500">Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.</p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
            Tên đăng nhập do quản trị viên cấp. Quên mật khẩu? Vui lòng liên hệ quản trị viên để được đặt lại.
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-slate-400">
            © {new Date().getFullYear()} Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc · Thiết kế: BS. Lê Đình Lam
            <br />
            Hỗ trợ sự cố:{" "}
            <Link href="tel:0941567496" className="font-medium text-brand-600 hover:text-brand-700">
              0941 567 496
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
