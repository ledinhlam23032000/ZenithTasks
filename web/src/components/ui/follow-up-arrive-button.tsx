"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { markFollowUpArrived } from "@/app/(app)/ho-so/actions";

/** Xác nhận khách đã đến lịch tái khám (1 chạm, không cần modal — giống QuickStatusButton của lịch hẹn). */
export function FollowUpArriveButton({ id, caseId }: { id: string; caseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function onClick() {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("caseId", caseId);
    startTransition(async () => {
      try {
        await markFollowUpArrived(fd);
        toast("Đã lưu");
        router.refresh();
      } catch {
        toast("Lỗi mạng, thử lại", "error");
      }
    });
  }

  return (
    <Button size="sm" variant="subtle" onClick={onClick} disabled={pending}>
      {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Đã đến
    </Button>
  );
}
