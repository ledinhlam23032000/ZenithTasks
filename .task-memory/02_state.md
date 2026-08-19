# Project State

- Updated: 2026-08-19 01:10 GMT+7
- Goal: Nâng cấp ZenithTasks từ trợ lý xử lý yêu cầu ngắn thành đồng nghiệp số có context dài, planner nhiều bước, câu trả lời tự nhiên, self-check và lifecycle conversation đúng.
- Current phase: Phase 7 — stress test read-only trên production, pre-deploy checkpoint.
- Overall status: active

## Completed since last checkpoint

Đã hoàn tất bộ nhớ hội thoại nhiều tầng với summary, durable facts, entities, decisions và verified facts; tăng context prompt lên khoảng 24.000 ký tự với ưu tiên lượt gần nhất; thêm compaction định kỳ sau 8+ lượt. Đã thêm xóa conversation trực tiếp từ sidebar với confirm và redirect, không xóa dữ liệu nghiệp vụ.

Planner hiện có schema `steps` tối đa 4 bước. `runAssistantAgent` chạy tuần tự các bước read-only bounded, audit từng bước, gom kết quả đã kiểm chứng và gửi vào final writer. Mọi chuỗi có write/delete đều bị chặn để tiếp tục dùng preview/approval/audit hiện hữu. Final writer hiện nhận mảng verified results và hợp nhất theo thứ tự kết luận → bằng chứng → bước tiếp theo.

Đã chạy `pnpm exec prisma generate` và full Vitest regression: 48 test files, 314 tests passed. TypeScript check và targeted tests cũng passed.

## Verified facts

Branch sandbox là `ai-deep-upgrade`, base `68b55fc` (`origin/master`). Production public URL vẫn đang chạy bản trước các thay đổi sandbox: câu `Chào em. Em có thể nói chuyện được ko` hiện trả lỗi parse tham số. Đây là bằng chứng cần deploy, không phải lỗi của branch mới.

Migration `web/prisma/migrations/20260819010000_assistant_memory/migration.sql` chỉ thêm các cột nullable/default vào `AssistantConversation`: `summary`, `memory`, `memoryVersion`, `lastCompactedAt`; không xóa dữ liệu khách, tiền, lương hay hồ sơ.

## Decisions made

Giữ DeepSeek làm lõi, không thêm dịch vụ trả phí hoặc fine-tune khi chưa có dataset. Multi-step chỉ cho read actions; mutation nhiều bước phải tách preview hoặc tạo action bulk rõ phạm vi. Không dùng Manus API để thay thế agent nội bộ. Không chạy write/destructive stress test trên production.

## Open blockers/questions

Cần commit/push branch, tạo và merge PR vào master, sau đó pull/build/restart đúng origin Windows `C:\Users\PC\ZenithTasks`. Sau deploy phải chạy lại các case read-only A01, A02, B01, E01, E06 và ghi kết quả. Cần xác nhận migration tự apply trong entrypoint production.

## Next 3 actions

1. Commit toàn bộ thay đổi đã kiểm thử và push branch `ai-deep-upgrade`.
2. Tạo PR, kiểm tra CI và merge vào `master`.
3. Deploy trên origin Windows, rồi chạy stress test read-only và cập nhật checkpoint production.

## Files to read first

- `.task-memory/02_state.md`
- `.task-memory/01_plan.md`
- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/app/(app)/tro-ly/conversations.ts`
- `web/src/lib/assistant.ts`
- `checks/assistant-evaluation-v2.md`

## Quality risks

Prompt dài không đồng nghĩa memory tốt; summary sai có thể làm AI bịa. Multi-step loop bị giới hạn 4 bước và read-only để tránh latency/side effect. Production hiện chưa chứa migration memory và planner loop cho đến khi release được deploy. Xóa conversation là thao tác không hoàn tác ở lớp lịch sử, nhưng server action chỉ cascade assistant messages và set-null approval, không chạm dữ liệu nghiệp vụ.
