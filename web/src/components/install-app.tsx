"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Download, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function InstallAppButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const [installedNow, setInstalledNow] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const installed = standalone || installedNow;

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalledNow(true);
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) {
      setOpen(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setInstalledNow(true);
    setPrompt(null);
  };

  if (installed) {
    return (
      <div className={cn("flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700", className)}>
        <CheckCircle2 className="h-4 w-4" /> Đã cài trên thiết bị
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl bg-brand-50 px-3 py-3 text-left text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition active:scale-[0.99]",
          className,
        )}
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <Download className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block">Cài ứng dụng lên điện thoại</span>
          <span className="block text-xs font-normal text-brand-600/80">Mở nhanh toàn màn hình như một app</span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Cài ứng dụng">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Đóng" />
          <section className="relative w-full max-w-md rounded-t-[1.75rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
                <Smartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">Cài trên iPhone trong 20 giây</h2>
                <p className="mt-1 text-sm text-slate-500">Dùng Safari và làm theo hai bước dưới đây.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-400 active:bg-slate-100" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-5 space-y-3">
              <li className="flex gap-3 rounded-2xl bg-slate-50 p-3.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Share className="h-4.5 w-4.5" /></span>
                <p className="pt-0.5 text-sm text-slate-700"><strong className="block text-slate-900">1. Bấm nút Chia sẻ</strong>Nút hình vuông có mũi tên hướng lên trong Safari.</p>
              </li>
              <li className="flex gap-3 rounded-2xl bg-slate-50 p-3.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm"><SquarePlus className="h-4.5 w-4.5" /></span>
                <p className="pt-0.5 text-sm text-slate-700"><strong className="block text-slate-900">2. Chọn “Thêm vào MH chính”</strong>Sau đó bấm Thêm. Biểu tượng ứng dụng sẽ xuất hiện trên iPhone.</p>
              </li>
            </ol>

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">Ứng dụng dùng cùng tài khoản và đầy đủ dữ liệu như bản web.</p>
          </section>
        </div>
      )}
    </>
  );
}
