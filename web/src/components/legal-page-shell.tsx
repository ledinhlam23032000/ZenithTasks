import type { ReactNode } from "react";
import Link from "next/link";

const legalLinks = [
  { href: "/chinh-sach-quyen-rieng", label: "Quyền riêng tư" },
  { href: "/dieu-khoan-su-dung", label: "Điều khoản" },
  { href: "/xoa-du-lieu", label: "Xóa dữ liệu" },
];

export function LegalPageShell({
  eyebrow,
  title,
  summary,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f5f2] text-slate-900">
      <div className="h-1 bg-[#b4232c]" />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-6 border-b border-slate-300/70 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="ZenithTasks — trang chủ">
            <span className="grid size-11 place-items-center rounded-full bg-[#8f1822] font-serif text-lg font-semibold text-white shadow-sm">
              Z
            </span>
            <span>
              <strong className="block font-serif text-xl tracking-tight">ZenithTasks</strong>
              <span className="block text-xs text-slate-600">Bệnh viện Đa khoa Hồng Phúc</span>
            </span>
          </Link>
          <nav aria-label="Tài liệu pháp lý" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-700">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="underline-offset-4 hover:text-[#8f1822] hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <article className="py-10 sm:py-16">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#9d1d27]">{eyebrow}</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-650">{summary}</p>
            <p className="mt-4 text-sm text-slate-500">Cập nhật lần cuối: {updatedAt}</p>
          </div>

          <div className="mt-10 grid gap-6 text-[15px] leading-7 text-slate-700 [&_a]:font-medium [&_a]:text-[#8f1822] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-slate-950 [&_li]:pl-1 [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:marker:font-semibold [&_ol]:marker:text-[#8f1822] [&_p+p]:mt-3 [&_section]:rounded-2xl [&_section]:border [&_section]:border-slate-200 [&_section]:bg-white [&_section]:p-6 [&_section]:shadow-[0_12px_40px_rgba(15,23,42,0.045)] [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-[#8f1822] sm:[&_section]:p-8">
            {children}
          </div>
        </article>

        <footer className="border-t border-slate-300/70 py-7 text-sm leading-6 text-slate-600">
          <p>Trung tâm Phẫu thuật Tạo hình và Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc</p>
          <p>
            Liên hệ: <a className="font-medium text-[#8f1822]" href="mailto:benhviendakhoahongphuchaiphong@gmail.com">benhviendakhoahongphuchaiphong@gmail.com</a>
            {" · "}
            <a className="font-medium text-[#8f1822]" href="tel:+84941567496">0941 567 496</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
