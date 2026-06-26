"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FormState = { ok?: boolean; error?: string; nonce?: number };

/**
 * Thay cho `useActionState` cho các form lưu dữ liệu.
 *
 * Khác biệt then chốt: spinner DỪNG ngay khi máy chủ lưu xong, KHÔNG chờ tải lại
 * toàn trang. Sau khi lưu thành công sẽ đóng form (`onSuccess`) rồi làm mới dữ
 * liệu ở chế độ nền bằng `router.refresh()`. Nhờ vậy hết cảnh "xoay mãi dù đã
 * lưu" khi đường truyền tới máy chủ phòng khám chậm.
 *
 * Cặp đôi với server action KHÔNG gọi `revalidatePath` — nếu gọi, Next sẽ gộp
 * việc render lại cả trang vào phản hồi của action (chậm, ràng buộc spinner).
 * Việc làm mới trang hiện tại do `router.refresh()` đảm nhiệm; các trang khác là
 * `force-dynamic` nên tự tải mới khi mở.
 *
 * API trả về giống hệt `useActionState`: `[state, action, pending]` → đổi chỗ
 * gọi gần như không cần sửa gì khác (bỏ luôn `useEffect` đóng modal — truyền
 * `onSuccess` thay thế).
 */
export function useFormAction<S extends FormState>(
  action: (prev: S, formData: FormData) => Promise<S>,
  onSuccess?: () => void,
) {
  const router = useRouter();
  const [state, setState] = useState<S>({} as S);
  const [pending, setPending] = useState(false);

  function run(formData: FormData) {
    setPending(true);
    setState({} as S);
    // Chạy bất đồng bộ, KHÔNG bọc trong transition để spinner không bị ràng buộc
    // với router.refresh() (việc làm mới chạy nền sau khi đã tắt spinner).
    void (async () => {
      try {
        const res = (await action({} as S, formData)) ?? ({ ok: true } as S);
        setPending(false);
        setState(res);
        if (res.ok && !res.error) {
          onSuccess?.();
          router.refresh();
        }
      } catch (err) {
        // KHÔNG nuốt redirect()/notFound() của Next — để điều hướng tiếp tục.
        const digest = (err as { digest?: unknown } | null)?.digest;
        if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))) {
          throw err;
        }
        setPending(false);
        setState({ error: "Không lưu được — vui lòng kiểm tra kết nối và thử lại." } as S);
      }
    })();
  }

  return [state, run, pending] as const;
}
