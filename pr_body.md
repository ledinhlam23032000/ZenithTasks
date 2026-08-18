## Tóm tắt

- Nâng cấp persona/policy, planner/writer và history shaping cho trợ lý admin.
- Giữ server-side permission, preview, approval, audit và idempotency.
- Thêm MediaRecorder + authenticated transcription route.
- Thêm backend voice tùy chọn `VOICE_PROVIDER=whisper-cpp` qua whisper-server `/inference`.
- Bổ sung test, cấu hình DeepSeek và tài liệu triển khai.

## Kiểm tra

- `pnpm exec tsc --noEmit`
- `pnpm test -- --reporter=dot` — 48 test files, 312 tests
- `pnpm build`
- ESLint các file assistant/voice đã sửa

## Lưu ý

Whisper.cpp là tùy chọn self-hosted; không tự bật nếu server chưa có service/model. Không mở whisper-server trực tiếp ra Internet.
