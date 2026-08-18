# Phương án tích hợp mã nguồn mở cho ZenithTasks

## Quyết định kỹ thuật

DeepSeek tiếp tục là lớp reasoning/chat chính của ZenithTasks. Không thay toàn bộ agent hiện tại bằng một framework agent lớn, vì repository đã có registry action, Zod validation, server-side permission, preview/approval, audit và các nghiệp vụ Prisma thật. Một framework mới có thể làm đẹp vòng lặp tool nhưng đồng thời tạo rủi ro bỏ qua policy hoặc làm mất tính minh bạch của approval.

Tích hợp được chọn trong vòng này là **whisper.cpp như backend speech-to-text tùy chọn**, chạy self-hosted ở mạng nội bộ hoặc sau firewall. Ứng dụng Next.js vẫn là proxy xác thực duy nhất: kiểm capability, MIME, kích thước, timeout, rồi forward tới whisper-server. DeepSeek không bị dùng cho audio; việc tách voice khỏi chat provider giúp không phụ thuộc việc DeepSeek có endpoint speech hay không.

## So sánh các hướng

| Hướng | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| DeepSeek + API transcription hiện tại | Ít vận hành, dễ bật, không cần thêm process | Phụ thuộc API voice bên ngoài; audio rời khỏi mạng nội bộ; không dùng được nếu chưa có voice key | Giữ làm mặc định |
| DeepSeek + whisper.cpp self-hosted | MIT, offline/private, có VAD, quantization, CPU/GPU/WASM và HTTP server; phù hợp dữ liệu phòng khám nhạy cảm | Cần Docker/custom runtime, model files, RAM/CPU và monitoring; phải benchmark tiếng Việt | Đã tích hợp làm tùy chọn `VOICE_PROVIDER=whisper-cpp` |
| DeepSeek + Vercel AI SDK/agent framework | Có streaming, UI hooks, structured output và tool loop sẵn | Migration lớn; dễ trùng với approval/action registry; phải xác minh provider compatibility và lifecycle tool | Chưa đưa vào lõi; chỉ xem xét adapter streaming hẹp sau |
| DeepSeek + RAG platform lớn | Quản lý document/index tốt hơn | Tăng nhiều dịch vụ, DB/vector store, chi phí và bề mặt bảo mật; hiện app đã có business snapshot/tool sống | Chưa dùng; file context hiện tại chưa cần platform mới |

## Cách bật whisper.cpp

Dự án upstream có `whisper-server` với cổng mặc định 8080 và endpoint `/inference`. Request multipart có file audio, prompt, language/temperature và `response_format=json`. ZenithTasks gọi endpoint này qua `/api/assistant/transcribe`; người dùng không gọi trực tiếp whisper-server.

Ví dụ biến môi trường:

```dotenv
VOICE_PROVIDER=whisper-cpp
VOICE_BASE_URL=http://127.0.0.1:8080
VOICE_API_KEY=
VOICE_MODEL=whisper-1
```

Nếu app chạy trong Docker còn whisper-server chạy ở container riêng, dùng tên service nội bộ, ví dụ `VOICE_BASE_URL=http://whisper:8080`. Cần bảo đảm whisper-server bind vào mạng nội bộ, có firewall/security group, giới hạn request và không mở endpoint upload thô ra Internet.

## Việc chưa tự động hóa

Tôi không tự tải model Whisper hoặc thêm một container nặng vào production trong vòng này vì chưa biết CPU/RAM máy chủ và topology Docker thực tế. whisper.cpp README ghi nhận memory xấp xỉ từ khoảng 273 MB cho tiny, 388 MB cho base, 852 MB cho small, 2.1 GB cho medium và 3.9 GB cho large; chọn model phải dựa trên benchmark tiếng Việt và tài nguyên máy thật.

Tôi cũng không chuyển sang Vercel AI SDK ngay. Adapter custom hiện tại đã có structured JSON, planner/writer tách lớp, retry, history shaping và action safety; thay framework chỉ để lấy tool loop sẽ không giải quyết phần quan trọng nhất là dữ liệu nghiệp vụ và kiểm soát admin.

## Tiêu chí chốt production

Whisper.cpp chỉ được bật mặc định sau khi benchmark 20 câu voice tiếng Việt gồm tên nhân sự, mã hồ sơ, ngày tháng, số tiền và lệnh admin. Cần đo Word Error Rate tương đối, độ trễ p95, RAM đỉnh, tỷ lệ lỗi codec và khả năng chịu đồng thời. Nếu không đạt hoặc máy yếu, giữ `openai-compatible` làm backend voice.

## Nguồn

[1]: https://github.com/ggml-org/whisper.cpp "ggml-org/whisper.cpp"
[2]: https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md "whisper.cpp server README"
[3]: https://github.com/vercel/ai "Vercel AI SDK"
[4]: https://github.com/ledinhlam23032000/ZenithTasks/blob/ai-admin-voice-upgrade/docs/AI-ADMIN-GATEWAY.md "ZenithTasks AI Admin Gateway"
