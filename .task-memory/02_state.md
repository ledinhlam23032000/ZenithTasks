# Project State

- Updated: 2026-08-18 15:11 GMT+7
- Goal: Nâng cấp trợ lý AI ZenithTasks thành trợ lý vận hành admin chuyên nghiệp, có tool nghiệp vụ an toàn và voice input ổn định.
- Current phase: Phase 3–5 implementation checkpoint — nền tảng hội thoại và voice MVP đã triển khai; đang chuyển sang hardening công cụ admin và test chuyên biệt.
- Overall status: active

## Completed since last checkpoint

- Clone repository `ledinhlam23032000/ZenithTasks` ở branch `master`; working tree sạch trước khi cài dependency.
- Đọc `web/AGENTS.md`, `web/README.md`, `docs/AI-ADMIN-GATEWAY.md`, `agent.ts`, `assistant-chat.tsx`, `ai.ts`, `assistant.ts`, `conversations.ts` và package scripts.
- Cài dependency bằng `pnpm install --frozen-lockfile --ignore-scripts`.
- Sinh Prisma client bằng `pnpm exec prisma generate`.
- Chạy baseline: `pnpm test -- --reporter=dot` đạt 46 test files / 306 tests.

## Verified facts

- Repository là Next.js 16 + React 19 + TypeScript + Prisma 7 + PostgreSQL; không phải scaffold WebDev tRPC.
- Trợ lý hiện có agent server-side với whitelist action, Zod validation, preview/approval 10 phút, audit và server-side permission.
- Hội thoại đang cắt còn 40 messages khi đọc DB và 20 turns khi đưa vào prompt; chưa có summary/memory có cấu trúc.
- `assistant.ts` có `ASSISTANT_SYSTEM` nhưng agent đang dùng system prompt riêng ở planner và final answer, tạo nguy cơ drift.
- `ai.ts` dùng provider thủ công qua `AI_API_KEY`/`AI_BASE_URL` và gọi structured JSON; không có timeout, retry/backoff, model catalog runtime, routing có đo lường hoặc streaming.
- Voice hiện chỉ dùng Web Speech API `SpeechRecognition`/`webkitSpeechRecognition` phía client trong `assistant-chat.tsx`; không có MediaRecorder, upload audio hoặc Whisper transcription. Đây là nguyên nhân trực tiếp khiến voice không ổn định/phụ thuộc browser.
- Admin Gateway đã có nhiều action thật (đọc tổng quan, lương, hồ sơ, công nợ, attendance, payroll, payment, follow-up, appointment, customer, consultation, payment request, work plan, system change) và tài liệu yêu cầu preview/approval/audit.
- UI đã có trạng thái pending, preview và confirm/hủy, nhưng chưa có voice recording state, transcript edit, retry, microphone permission UX, hoặc action result verification chi tiết.
- File context/feedback hiện được ghép vào prompt dạng text; đây là memory thô, chưa có phân loại nguồn, freshness, confidence hoặc chọn lọc theo intent.
- Baseline test sau khi generate Prisma: PASS — 46 files, 306 tests. Trước khi generate Prisma có lỗi môi trường thiếu `@/generated/prisma/client`, không phải lỗi logic.

## Active assumptions

- Vòng đầu ưu tiên hybrid rule gate + AI planner/final writer; chưa fine-tune.
- Không mở rộng action tự động nếu chưa kiểm tra action nghiệp vụ thật, quyền và audit.
- TTS chưa làm ở vòng đầu; hoàn thiện STT trước.

## Decisions made

- Không thay model đơn thuần; sẽ hợp nhất prompt/policy, nâng lớp AI adapter, memory/context, tool safety và voice.
- Giữ human-in-the-loop cho các thao tác ghi/xóa/tiền/lương/y khoa/bulk.
- Không đưa secret vào client hoặc cho model truy cập trực tiếp Prisma/SQL.

## Open blockers/questions

- Cần benchmark model thật theo các biến môi trường hiện có; sandbox clone không chứa secret production.
- Cần xác định production đang dùng provider/model nào và liệu có endpoint catalog hay không.
- Cần kiểm tra browser thực tế sau khi triển khai voice; hiện source cho thấy không có đường audio server-side.

## Implementation completed after baseline

- Hợp nhất persona/policy thành `ASSISTANT_SYSTEM`, `ASSISTANT_PLANNER_SYSTEM` và `ASSISTANT_FINAL_SYSTEM`; agent planner/final writer dùng chung policy.
- `ai.ts` có timeout 5–120 giây, retry/backoff giới hạn cho 408/409/425/429/5xx và hỗ trợ `AI_WRITER_MODEL` per-call.
- Lịch sử hội thoại được đánh nhãn ANH/EM, giữ tối đa 24 lượt, cắt nội dung quá dài và giới hạn prompt 18.000 ký tự.
- File/feedback context được đánh dấu là dữ liệu tham chiếu không đáng tin, không phải system instruction.
- Thêm `/api/assistant/transcribe` server-side với auth capability, giới hạn 16MB, language `vi`, prompt ngữ cảnh và timeout 60 giây.
- UI assistant đã có MediaRecorder, xin quyền microphone, timer, dừng tự động sau 120 giây, upload multipart, transcript nối vào ô nhập, fallback SpeechRecognition, retry/error state.
- Bổ sung biến môi trường mẫu: `AI_WRITER_MODEL`, `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `VOICE_API_KEY`, `VOICE_BASE_URL`, `VOICE_MODEL`.
- Quality checkpoint: `tsc --noEmit`, 48 test files/311 tests và `pnpm build` đều PASS; thêm 3 voice endpoint contract tests và 2 history tests.

## Next 3 actions

1. Hoàn tất regression sau thay đổi Compose/README và kiểm tra diff cuối.
2. Chạy lint để phân biệt lỗi pre-existing; chạy build lần cuối.
3. Tạo commit/branch bàn giao, không push production trực tiếp; ghi rõ cần staging credential cho live voice test.

## Files to read first

- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/app/(app)/tro-ly/assistant-chat.tsx`
- `web/src/lib/ai.ts`
- `web/src/lib/assistant.ts`
- `web/src/app/(app)/tro-ly/conversations.ts`
- `docs/AI-ADMIN-GATEWAY.md`

## Quality risks

- Thay đổi prompt có thể làm regression các action attendance và approval; phải giữ test hiện tại và thêm evaluation cases.
- Model/provider bên ngoài có thể không hỗ trợ JSON schema hoặc tool semantics giống nhau.
- Voice codec/permission khác nhau theo browser; phải feature-detect và báo lỗi rõ thay vì giả vờ đã ghi âm.
