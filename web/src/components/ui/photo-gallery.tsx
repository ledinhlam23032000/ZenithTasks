"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { photoSrc } from "@/lib/media";
import { fmtDate } from "@/lib/format";
import { PhotoTypeLabel } from "@/app/(app)/ho-so/[id]/photo-label";
import type { PhotoType } from "@/generated/prisma/client";

export type GalleryPhoto = {
  id: string;
  url: string;
  type: PhotoType;
  followUpIndex?: number | null;
  caption?: string | null;
  takenAt: Date | string;
};

/**
 * Lưới ảnh + xem phóng to khi bấm (ảnh tải từ máy chủ theo yêu cầu).
 * Ảnh thu nhỏ tải lười (lazy) để tiết kiệm băng thông; bấm để xem to + tải về.
 */
export function PhotoGallery({
  photos,
  cols = 4,
  deleteAction,
  caseId,
  accessToken,
}: {
  photos: GalleryPhoto[];
  cols?: number;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  caseId?: string;
  accessToken?: string;
}) {
  const [idx, setIdx] = useState<number | null>(null);
  const open = idx !== null;
  const cur = open ? photos[idx] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIdx(null);
      if (e.key === "ArrowLeft") setIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
      if (e.key === "ArrowRight") setIdx((i) => (i === null ? i : (i + 1) % photos.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos.length]);

  return (
    <>
      <div className={`grid gap-2.5 ${cols === 3 ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4"}`}>
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="group relative overflow-hidden rounded-xl border border-slate-200 transition hover:border-brand-300 hover:shadow-sm"
          >
            <button
              type="button"
              onClick={() => setIdx(i)}
              className="block w-full text-left"
              title="Bấm để xem ảnh lớn"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoSrc(p.url, accessToken)}
                alt={p.caption ?? "Ảnh"}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full bg-slate-100 object-cover transition group-hover:opacity-90"
              />
              <figcaption className="flex items-center justify-between gap-1 px-2 py-1.5">
                <PhotoTypeLabel type={p.type} index={p.followUpIndex} />
                <span className="text-[11px] text-slate-400">{fmtDate(p.takenAt)}</span>
              </figcaption>
            </button>
            {deleteAction && (
              <form
                action={deleteAction}
                className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100"
              >
                <input type="hidden" name="id" value={p.id} />
                {caseId && <input type="hidden" name="caseId" value={caseId} />}
                <button
                  type="submit"
                  className="rounded-lg bg-white/90 p-1.5 text-rose-600 shadow-sm transition hover:bg-rose-600 hover:text-white"
                  title="Xóa ảnh này"
                  aria-label="Xóa ảnh"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      {open && cur && (
        <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm" onClick={() => setIdx(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-sm">
              <PhotoTypeLabel type={cur.type} index={cur.followUpIndex} />
              <span className="text-slate-300">{fmtDate(cur.takenAt)}</span>
              {cur.caption && <span className="text-slate-400">· {cur.caption}</span>}
            </div>
            <div className="flex items-center gap-1">
              <a
                href={photoSrc(cur.url, accessToken)}
                download
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                title="Tải ảnh về máy"
              >
                <Download className="h-4 w-4" /> Tải về
              </a>
              <button onClick={() => setIdx(null)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            {photos.length > 1 && (
              <button
                onClick={() => setIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))}
                className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc(cur.url, accessToken)} alt={cur.caption ?? "Ảnh"} className="max-h-full max-w-full rounded-lg object-contain" />
            {photos.length > 1 && (
              <button
                onClick={() => setIdx((i) => (i === null ? i : (i + 1) % photos.length))}
                className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Ảnh sau"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
