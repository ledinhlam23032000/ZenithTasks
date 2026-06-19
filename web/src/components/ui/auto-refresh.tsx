"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tự làm mới dữ liệu trang theo chu kỳ (chỉ khi tab đang hiển thị) để nhiều
 * người dùng thấy cập nhật gần như tức thời mà không cần hạ tầng real-time.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
