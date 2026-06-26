"use client";

import { useEffect } from "react";

/** Đăng ký service worker để app có thể "cài như phần mềm máy tính" (PWA). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
