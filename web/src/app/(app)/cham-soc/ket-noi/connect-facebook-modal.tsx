"use client";

import { useState } from "react";
import { MessageCircle, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { connectFacebookPage } from "./actions";

export function ConnectFacebookModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(connectFacebookPage, () => setOpen(false));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <MessageCircle className="h-4 w-4" /> Kết nối Facebook Page
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Kết nối Facebook Page" size="md">
        <div className="space-y-3 text-sm text-slate-600">
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>
              Vào <span className="font-medium">Meta Business Suite</span> → Cài đặt doanh nghiệp → Người dùng hệ thống → tạo 1 người dùng hệ
              thống, gán quyền quản trị Fanpage.
            </li>
            <li>
              Tạo token cho người dùng đó với quyền <code className="rounded bg-slate-100 px-1 py-0.5">pages_messaging</code> +{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">pages_show_list</code> — token này KHÔNG hết hạn (khác token lấy nhanh qua
              Graph API Explorer chỉ sống ~1 giờ).
            </li>
            <li>Dán token vào ô bên dưới — hệ thống tự nhận diện đúng Fanpage.</li>
          </ol>
          <form action={action} className="space-y-2.5">
            <Textarea name="pageAccessToken" placeholder="Dán Page Access Token vào đây…" required className="min-h-[90px] font-mono text-xs" />
            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Kết nối
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
