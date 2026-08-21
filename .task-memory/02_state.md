# Project State

- Updated: 2026-08-21 16:50 GMT+7
- Goal: Nâng cấp ZenithTasks từ trợ lý xử lý yêu cầu ngắn thành đồng nghiệp số có context dài, planner nhiều bước, câu trả lời tự nhiên, self-check và lifecycle conversation đúng.
- Current phase: P7 — local regression đã hoàn tất; chờ merge/deploy để chạy read-only smoke production.
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

Regression local đã pass nhưng chưa phải live evaluation. Cần commit/push branch mới, tạo và merge PR vào master, sau đó pull/build/restart đúng origin Windows `C:\Users\PC\ZenithTasks`. Sau deploy phải chạy lại các case read-only A01, A02, B01, E01, E06 và ghi prompt/output/action/latency/side-effect check. Không chạy write/destructive test trên production.

## Next 3 actions

1. Commit test/evidence regression local của branch `feat/ai-regression-r8`, tạo PR và kiểm tra CI.
2. Merge vào `master`, cập nhật máy Windows bằng `Sua-Loi.bat` sau khi owner chủ động chạy.
3. Mở cuộc trò chuyện AI mới và chạy read-only A01, A02, B01, E01, E06; cập nhật production evidence và chốt P7/P8.

## Files to read first

- `.task-memory/02_state.md`
- `.task-memory/01_plan.md`
- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/app/(app)/tro-ly/conversations.ts`
- `web/src/lib/assistant.ts`
- `checks/assistant-evaluation-v2.md`

## Quality risks

Prompt dài không đồng nghĩa memory tốt; summary sai có thể làm AI bịa. Multi-step loop bị giới hạn 4 bước và read-only để tránh latency/side effect. Production hiện chưa chứa migration memory và planner loop cho đến khi release được deploy. Xóa conversation là thao tác không hoàn tác ở lớp lịch sử, nhưng server action chỉ cascade assistant messages và set-null approval, không chạm dữ liệu nghiệp vụ.

## AI regression r8 — 2026-08-21

Đã bổ sung regression deterministic cho adapter AI và conversation context trong PR #38: retry khi provider trả 429; lỗi output rỗng/JSON hỏng phải dừng ổn định, không chạy action; stale AI error/transient error bị loại khỏi prompt; history chỉ còn lỗi dùng fallback trung thực. Evidence chi tiết nằm tại `checks/2026-08-21-ai-regression-local.md`.

Quality gate local đạt: targeted 2 file/19 test pass; full Vitest **53 file/338 test pass**; TypeScript, ESLint tệp thay đổi và Next production build pass. Không gọi model production, không dùng dữ liệu khách thật, không tạo approval, không ghi/xóa nghiệp vụ. PR #38 đã merge vào master lúc `2026-08-21T09:51:17Z`; merge commit hiện tại `749b00a`.

P7/P8 vẫn chưa chốt release gate vì các case live read-only A01, A02, B01, E01, E06 chưa được chạy sau deploy trên máy Windows. Bước an toàn tiếp theo là owner chạy `Sua-Loi.bat`, mở cuộc trò chuyện AI mới, chạy đúng các case này và lưu prompt/output/steps/latency/side-effect check; các case D01–D06 ghi/xóa tiếp tục chỉ chạy preview/mock.

## Windows update blocker và hợp nhất branch — 2026-08-21

Đã đọc log `C:\Users\PC\ZenithTasks\docker-build-r4/r5/r6`. Log r5 dừng tại bước `RUN pnpm exec prisma generate && pnpm run build`, chưa có lỗi TypeScript/Next; stderr ghi `failed to execute bake: exit status 0xc000013a`. Mã này phù hợp với tiến trình Docker Bake bị ngắt giữa build, không phải bằng chứng thiếu migration. Log Xem-Lỗi ghi `NativeCommandError` vì PowerShell redirect trực tiếp stderr của native Prisma; bên dưới vẫn có `51 migrations found`, `Database schema is up to date` và app ready tại localhost:3000.

Đã merge PR #41 `fix: lam on dinh script cap nhat Windows`: `Sua-Loi.ps1` buộc local về `master` bằng fetch/checkout/reset, không `git clean`; tắt Compose Bake bằng `COMPOSE_BAKE=false`; gom build stdout/stderr vào log timestamp; kiểm tra exit code fetch/checkout/reset/build/compose up/migrate deploy; không tiếp tục nếu lỗi và giữ bản đang chạy. `Xem-Loi.ps1` gom output thành text bình thường và chỉ ghi exit code khi lệnh thật sự thất bại.

Đã kiểm tra PR #40 UX Phase 1, CI xanh, merge vào master rồi xóa branch. Các branch remote cũ khác đều được xác nhận fully contained trong master và đã xóa. Remote hiện chỉ còn `master`; master sau PR #40 là `2125751`. Các branch phụ không bị gộp mù.

Việc còn lại: anh Lam chạy lại `windows\\Sua-Loi.bat` từ master mới, không đóng cửa sổ trong suốt bước build 5–15 phút. Nếu build vẫn lỗi, gửi file `docker-build-<timestamp>.log` mới; không cần gửi lại `Xem-Loi` nếu migration đã báo schema up to date.

## Hồ sơ dịch vụ thẩm mỹ trong Giấy tờ — 2026-08-21

Đã tái cấu trúc `web/src/app/(app)/ho-so/[id]/page.tsx`: form Hồ sơ dịch vụ thẩm mỹ không còn nằm trong tab Tư vấn; tab Giấy tờ hiện chứa bản hồ sơ tự sinh, form chỉnh/lưu, Phiếu đồng ý và tài liệu upload. Nút `+ Thêm giấy tờ` tiếp tục dùng chung cho mở hồ sơ, ghi nhận consent và upload. Workspace admin/lâm sàng mở mặc định ở tab Giấy tờ.

Đã thêm `web/src/lib/case-lock.ts` với mốc auto-lock 24 giờ. UI hiển thị cảnh báo tự khóa; Server Actions dùng cùng helper để chặn nhân viên sau hạn, trong khi ADMIN vẫn được chỉnh/mở khóa. Không thêm migration, không xóa lịch sử. Checklist đã đổi nhãn sang Hồ sơ dịch vụ thẩm mỹ.

Đã tiếp tục UX Task 12 bằng badge `Thiếu`, `Rà soát` và `Thiếu xác nhận` trên thanh tab, không tự áp BOM vật tư. Local quality gate đạt: targeted 10 test pass; full Vitest **58 file/354 test pass**; TypeScript, ESLint tệp thay đổi và Next production build pass. Branch hiện tại `fix/paperwork-tab-autolock` đang chờ commit/PR/CI/merge.

Sau khi merge cần tiếp tục live smoke AI read-only A01/A02/B01/E01/E06; không chạy write/destructive test production.
