"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";

/**
 * Ranh giới lỗi cho toàn bộ khu vực ứng dụng. Khi một trang gặp lỗi máy chủ,
 * người dùng thấy thông báo thân thiện + nút thử lại (không còn màn hình trắng).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Ghi log ra console máy chủ để tiện chẩn đoán.
    console.error("Lỗi trang ứng dụng:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="text-lg font-semibold text-slate-900">Không tải được trang này</h1>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Đã xảy ra lỗi tạm thời khi tải dữ liệu. Vui lòng bấm “Thử lại”. Nếu vẫn lỗi, hãy báo cho
        quản trị để cập nhật lại ứng dụng (chạy lại file <b>Sua-Loi.bat</b>).
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <RotateCcw className="h-4 w-4" /> Thử lại
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <LayoutDashboard className="h-4 w-4" /> Về Tổng quan
        </a>
      </div>
      {error.digest && <p className="mt-4 text-xs text-slate-400">Mã lỗi: {error.digest}</p>}
    </div>
  );
}
