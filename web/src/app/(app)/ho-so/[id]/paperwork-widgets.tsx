"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronDown, FilePlus2, FileUp, FolderOpen, Plus } from "lucide-react";
import { DropdownPortal } from "@/components/ui/dropdown-portal";
import { AddConsentButton } from "./consent-widgets";
import { UploadDocumentButton } from "./case-document-widgets";

type Template = { id: string; title: string; body: string };

type PaperworkAddMenuProps = {
  caseId: string;
  customerName: string;
  caseCode: string;
  services: string;
  templates: Template[];
  todayLocal: string;
};

const menuItemClass = "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

/**
 * Một nút + duy nhất cho toàn bộ giấy tờ trong hồ sơ.
 * Các form gốc vẫn được giữ nguyên để không ảnh hưởng dữ liệu ConsentRecord/CaseDocument.
 */
export function PaperworkAddMenu({ caseId, customerName, caseCode, services, templates, todayLocal }: PaperworkAddMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setOpen(false);

  return (
    <div className="print-hide">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Plus className="h-4 w-4" /> Thêm giấy tờ <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      <DropdownPortal
        open={open}
        anchorRef={buttonRef}
        onClose={closeMenu}
        className="z-30 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
      >
        <Link href={`/ho-so/${caseId}/consultation`} onClick={closeMenu} className={menuItemClass}>
          <FolderOpen className="h-4 w-4 text-brand-600" /> Mở Hồ sơ dịch vụ thẩm mỹ
        </Link>
        <div className="my-1 border-t border-slate-100" />
        <AddConsentButton
          caseId={caseId}
          customerName={customerName}
          caseCode={caseCode}
          services={services}
          templates={templates}
          todayLocal={todayLocal}
          trigger={<><FilePlus2 className="h-4 w-4 text-amber-600" /> Ghi nhận Phiếu đồng ý</>}
        />
        <UploadDocumentButton
          caseId={caseId}
          trigger={<><FileUp className="h-4 w-4 text-emerald-600" /> Tải tài liệu khác lên</>}
        />
      </DropdownPortal>
    </div>
  );
}

