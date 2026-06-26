"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { photoSrc } from "@/lib/media";
import { fmtDate } from "@/lib/format";
import { PhotoTypeLabel } from "@/app/(app)/ho-so/[id]/photo-label";
import type { GalleryPhoto } from "./photo-gallery";

/** Nút mở modal so sánh ảnh trước/sau dạng kéo-trượt (chỉ hiện khi có ≥ 2 ảnh). */
export function PhotoCompareButton({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState(false);
  if (photos.length < 2) return null;
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="h-4 w-4" /> So sánh trước/sau
      </Button>
      {open && <PhotoCompareModal photos={photos} onClose={() => setOpen(false)} />}
    </>
  );
}

function PhotoCompareModal({ photos, onClose }: { photos: GalleryPhoto[]; onClose: () => void }) {
  const sorted = useMemo(
    () => [...photos].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()),
    [photos],
  );
  // Mặc định: ảnh "Trước" sớm nhất bên trái, ảnh gần nhất (không phải "Trước") bên phải.
  const defaultLeft = sorted.findIndex((p) => p.type === "BEFORE");
  const lastNonBefore = [...sorted].reverse().findIndex((p) => p.type !== "BEFORE");
  const defaultRight = lastNonBefore >= 0 ? sorted.length - 1 - lastNonBefore : sorted.length - 1;

  const [leftIdx, setLeftIdx] = useState(defaultLeft >= 0 ? defaultLeft : 0);
  const [rightIdx, setRightIdx] = useState(defaultRight !== leftIdx ? defaultRight : sorted.length - 1);

  const left = sorted[leftIdx];
  const right = sorted[rightIdx];

  return (
    <Modal open onClose={onClose} title="So sánh ảnh trước / sau" description="Kéo thanh trượt để so sánh." size="xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <PhotoSelect label="Ảnh bên trái" photos={sorted} value={leftIdx} onChange={setLeftIdx} />
        <PhotoSelect label="Ảnh bên phải" photos={sorted} value={rightIdx} onChange={setRightIdx} />
      </div>
      <div className="mt-4">
        <CompareSlider left={left} right={right} />
      </div>
    </Modal>
  );
}

function PhotoSelect({
  label,
  photos,
  value,
  onChange,
}: {
  label: string;
  photos: GalleryPhoto[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
      >
        {photos.map((p, i) => (
          <option key={p.id} value={i}>
            {labelFor(p)} · {fmtDate(p.takenAt)}
          </option>
        ))}
      </select>
    </label>
  );
}

function labelFor(p: GalleryPhoto): string {
  if (p.type === "BEFORE") return "Trước";
  if (p.type === "AFTER") return "Sau";
  if (p.type === "CLINICAL") return "Cận lâm sàng";
  return `Tái khám${p.followUpIndex ? ` lần ${p.followUpIndex}` : ""}`;
}

function CompareSlider({ left, right }: { left?: GalleryPhoto; right?: GalleryPhoto }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  };

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      onPointerDown={(e) => {
        dragging.current = true;
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerLeave={() => {
        dragging.current = false;
      }}
    >
      {right ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc(right.url)}
          alt="Ảnh bên phải"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">Không có ảnh</div>
      )}
      {left && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc(left.url)} alt="Ảnh bên trái" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
      <div
        className="pointer-events-none absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200"
        style={{ left: `${pos}%` }}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </div>
      <div className="pointer-events-none absolute left-2 top-2">
        {left && <PhotoTypeLabel type={left.type} index={left.followUpIndex} />}
      </div>
      <div className="pointer-events-none absolute right-2 top-2">
        {right && <PhotoTypeLabel type={right.type} index={right.followUpIndex} />}
      </div>
    </div>
  );
}
