"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, LoaderCircle } from "lucide-react";

function decodeBase64Url(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

export function PushNotificationButton({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"off" | "on" | "loading" | "unsupported" | "denied">("off");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function inspect() {
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setState(subscription ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    }
    void inspect();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enable() {
    setMessage("");
    if (!publicKey) {
      setMessage("Máy chủ chưa bật cấu hình thông báo.");
      return;
    }
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        setMessage("Hãy cho phép thông báo trong trình duyệt để nhận tin mới.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(publicKey),
      });
      const res = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error("subscribe_failed");
      setState("on");
      setMessage("Đã bật thông báo tin mới trên thiết bị này.");
    } catch {
      setState("off");
      setMessage("Không bật được thông báo. Hãy thử lại hoặc kiểm tra quyền trình duyệt.");
    }
  }

  const disabled = state === "loading" || state === "unsupported" || state === "denied";
  const title =
    state === "on"
      ? "Thông báo tin mới đã bật"
      : state === "denied"
        ? "Thông báo đang bị chặn trong trình duyệt"
        : state === "unsupported"
          ? "Thiết bị/trình duyệt chưa hỗ trợ thông báo nền"
          : "Bật thông báo tin nhắn mới";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={enable}
        disabled={disabled || state === "on"}
        title={title}
        aria-label={title}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:cursor-default disabled:opacity-80"
      >
        {state === "loading" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : state === "on" ? <BellRing className="h-5 w-5 text-brand-600" /> : <Bell className="h-5 w-5" />}
        {state === "on" && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
      </button>
      {message && <span className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">{message}</span>}
    </div>
  );
}
