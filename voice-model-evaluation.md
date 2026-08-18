# Đánh giá voice tiếng Việt miễn phí

## Kết luận kỹ thuật

Máy Windows 16GB RAM, GPU 2GB và ổ đĩa 2TB đủ khả năng chạy nhận dạng giọng nói tiếng Việt cục bộ. Phương án an toàn nhất là `whisper.cpp` chạy CPU với model `base` hoặc `small` đã lượng tử hóa; không nên mặc định dùng `medium`/`large` vì vừa nặng vừa có thể làm máy chậm khi Docker, PostgreSQL và ứng dụng đang chạy.

`whisper.cpp` hỗ trợ Windows, CPU-only, CUDA/Vulkan/OpenVINO, VAD và Docker. Tài liệu upstream ghi kích thước bộ nhớ xấp xỉ: tiny 273MB, base 388MB, small 852MB, medium 2.1GB và large 3.9GB. CLI cần WAV PCM 16-bit 16kHz mono hoặc phải bật/đưa thêm bước chuyển đổi audio. [1]

`faster-whisper` là lựa chọn Python nhanh và tiết kiệm hơn OpenAI Whisper gốc; upstream mô tả hỗ trợ quantization 8-bit và chạy CPU bằng `int8`, nhưng GPU NVIDIA cần CUDA/cuDNN phù hợp. Với GPU chỉ 2GB và production đang chạy Docker trên Windows, ưu tiên `whisper.cpp` CPU sẽ ít phụ thuộc hơn. [2]

`PhoWhisper` là model được fine-tune riêng cho tiếng Việt trên 844 giờ dữ liệu, có các cỡ tiny/base/small/medium/large và công bố kết quả tốt trên benchmark tiếng Việt. PhoWhisper phù hợp nếu cần chất lượng tiếng Việt cao hơn Whisper đa ngôn ngữ, nhưng tích hợp vào whisper.cpp cần đúng định dạng/đường chuyển model; vì vậy bước đầu nên benchmark `whisper.cpp base/small` trước, sau đó mới cân nhắc PhoWhisper qua faster-whisper/Transformers. [3] [4]

## Phương án nên triển khai

| Phương án | Chi phí API | Tài nguyên | Phù hợp hiện tại |
|---|---:|---:|---|
| whisper.cpp `base` CPU | 0đ | Nhẹ, khoảng 388MB model theo upstream | Nên thử đầu tiên |
| whisper.cpp `small` CPU/int8 | 0đ | Khoảng 852MB model, chậm hơn nhưng tiếng Việt tốt hơn | Nên dùng nếu tốc độ ổn |
| PhoWhisper-small qua faster-whisper CPU int8 | 0đ | Cần Python/runtime riêng và model lớn hơn | Giai đoạn 2 nếu base/small chưa đủ |
| faster-whisper GPU | 0đ API, nhưng cần CUDA/cuDNN | GPU 2GB hạn chế, dễ thiếu VRAM | Không chọn mặc định |
| DeepSeek cho voice | Có thể phát sinh phí/không phải STT | Không phù hợp endpoint hiện tại | Không dùng |

## Cách nối vào ZenithTasks

Endpoint `/api/assistant/transcribe` đã hỗ trợ `VOICE_PROVIDER=whisper-cpp` và gọi proxy nội bộ `/inference`; không cần đổi UI, không cần lộ endpoint whisper ra Internet, và không cần API key voice. Cần chạy whisper-server nội bộ trên cùng máy/network Docker, mount model vào volume, đặt `VOICE_BASE_URL` trỏ tới service đó, rồi test microphone trước khi bật production.

## Rủi ro cần kiểm tra

Ổ cứng 2TB đủ chứa model, nhưng không quyết định tốc độ; tốc độ phụ thuộc CPU, số threads và độ dài audio. GPU 2GB nên để dành cho hiển thị/Docker và không ép CUDA nếu driver/model không phù hợp. Máy Windows phải bật và không ngủ nếu muốn voice/website hoạt động liên tục qua Cloudflare Tunnel.

## References

[1]: https://github.com/ggml-org/whisper.cpp "ggml-org/whisper.cpp"
[2]: https://github.com/SYSTRAN/faster-whisper "SYSTRAN/faster-whisper"
[3]: https://github.com/VinAIResearch/PhoWhisper "VinAIResearch/PhoWhisper"
[4]: https://arxiv.org/abs/2406.02555 "PhoWhisper: Automatic Speech Recognition for Vietnamese"
