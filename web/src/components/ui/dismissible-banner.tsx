"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_PREFIX = "zenith:dismissed-banner:";

export function DismissibleBanner({
  bannerKey,
  children,
  className = "",
}: {
  bannerKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${bannerKey}`);
      queueMicrotask(() => {
        if (!cancelled) setVisible(saved !== "1");
      });
    } catch {
      // Nếu trình duyệt chặn localStorage, vẫn cho phép đóng trong phiên hiện tại.
    }
    return () => {
      cancelled = true;
    };
  }, [bannerKey]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${bannerKey}`, "1");
    } catch {
      // Không làm hỏng trang nếu storage không khả dụng.
    }
  }

  return (
    <div className={`relative pr-12 ${className}`}>
      {children}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng cảnh báo"
        title="Đóng cảnh báo"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-current opacity-60 transition hover:bg-black/5 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
