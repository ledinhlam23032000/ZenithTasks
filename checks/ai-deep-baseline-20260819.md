# AI Deep Upgrade — Baseline 2026-08-19

## Environment

Baseline chạy trên sandbox clone tại commit production `68b55fc` (`fix: harden DeepSeek planner JSON fallback (#22)`). Prisma client được generate trước khi chạy test. Không dùng DeepSeek production secret trong sandbox.

## Automated baseline

| Check | Result |
|---|---|
| Vitest | 48 test files passed |
| Tests | 314 passed |
| Prisma generate | Completed |
| Full tsc command | Runner wrapper timed after Vitest completion; tsc log không có lỗi ghi nhận, cần chạy tsc riêng ở checkpoint sau |

## Findings from code review

Planner hiện gọi một structured plan duy nhất, chọn tối đa một action rồi xử lý read/preview. Không có vòng lặp bounded cho các yêu cầu cần nhiều công cụ hoặc bước kiểm tra. History chỉ giữ 40 messages khi đọc DB và 24 turns/18.000 ký tự khi prompt; không có conversation summary, durable facts hay retrieval theo intent.

Sidebar chỉ hiển thị link; xóa chỉ có trên conversation đang mở. Server delete đã có transaction và schema cascade message/set-null approval, nên blocker chính là lifecycle UX và lựa chọn phiên, không phải foreign key.

## Stress cases not yet run

Long multi-turn goal retention, conflict resolution, stale approval/error contamination, multi-tool read chain, long Vietnamese requests, no-diacritic input, prompt injection in uploaded files, writer quality rubric, latency under reasoner, and explicit conversation deletion from sidebar remain open.

## Live production smoke finding

Trên production, yêu cầu tự nhiên `Chào em. Em có thể nói chuyện được ko` bị trả về `Tôi chưa đọc được tham số yêu cầu. Anh hãy nói rõ tên, tháng hoặc số tiền.`. Đây là lỗi logic xác định được trong `runAssistantAgent`: code parse `arguments_json` trước khi xử lý `action === "none"`; planner có thể để `{}`/trống cho casual conversation và request bị chặn. Đây là lỗi chất lượng cao cần sửa trước khi đánh giá tiếp.
