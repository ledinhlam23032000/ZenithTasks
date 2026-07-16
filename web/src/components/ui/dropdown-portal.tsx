"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Nội dung menu thả xuống render qua portal vào <body> — nút kích hoạt thường nằm trong
 * `PageHeader`'s actions row (`overflow-x-auto` để cuộn ngang trên di động); theo quy tắc CSS,
 * đặt overflow-x khác "visible" buộc overflow-y cũng thành "auto", nên menu `position:absolute`
 * lồng bên trong bị CẮT MẤT hoàn toàn (không hiện, không bấm được) dù DOM/geometry vẫn hợp lệ.
 * Portal ra <body> + tự tính toạ độ theo nút kích hoạt để né hẳn mọi ancestor overflow/stacking.
 */
export function DropdownPortal({
  open,
  anchorRef,
  onClose,
  align = "right",
  className,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  align?: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setPos(
      align === "right"
        ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, left: rect.left },
    );
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    }
    function onScrollOrResize() {
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, right: pos.right }}
      className={cn("animate-menu-in", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
