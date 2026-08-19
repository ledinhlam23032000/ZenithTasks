# Brief — ZenithTasks AI Deep Upgrade

## Mục tiêu

Nâng trợ lý AI nội bộ từ bộ xử lý câu hỏi ngắn thành đồng nghiệp số có thể giữ mục tiêu dài, hiểu hội thoại nhiều lượt, lập kế hoạch nhiều bước, tự kiểm tra, trả lời mượt và chuyên nghiệp, đồng thời vẫn bảo vệ các thao tác admin bằng quyền server, preview, approval, audit và idempotency.

## Phạm vi

Phạm vi chính gồm memory/context dài hạn, planner/agent loop, final writer, UX hội thoại, evaluation harness, lifecycle conversation và xóa phiên không dùng. Voice tiếng Việt mã nguồn mở được đánh giá riêng; không để voice làm chậm hoặc phá luồng chat/admin.

## Không làm

Không fine-tune trọng số DeepSeek trong vòng này nếu chưa có dataset chất lượng và benchmark; không cho AI truy cập trực tiếp SQL/Prisma; không tự thực hiện mutation nguy hiểm; không xóa dữ liệu nghiệp vụ khi người dùng chỉ nói chung chung về xóa hội thoại.

## Tiêu chí thành công

Trợ lý phải giữ được mục tiêu qua ít nhất 10 lượt liên quan, không lẫn phiên cũ, biết tóm tắt và truy xuất memory, xử lý yêu cầu dài bằng kế hoạch rõ ràng, tự kiểm tra trước khi báo kết quả, không bịa số liệu/trạng thái, không vượt quyền và có thể xóa conversation trợ lý theo đúng lựa chọn của ADMIN. Evaluation stress phải có bằng chứng, không chỉ đánh giá cảm tính.

## Nguồn sự thật

Mã nguồn: `/home/ubuntu/zenithtasks` và origin Windows `C:\Users\PC\ZenithTasks`. Checkpoint dài hạn: `.task-memory/`. Production hiện đi qua Docker Desktop trên Windows và Cloudflare Tunnel; DeepSeek đã được cấu hình và hotfix structured output đã deploy.
