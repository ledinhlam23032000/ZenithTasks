# Runbook hỗ trợ

Mỗi ticket phải ghi clinic, environment, commit, thời gian, triệu chứng, user/role, request id nếu có và liệu có dữ liệu bệnh nhân liên quan hay không. Không yêu cầu khách gửi ảnh bệnh nhân hoặc secret vào chat.

Phân loại:

- P0: lộ dữ liệu, mất dữ liệu, không thể vận hành toàn hệ thống — cô lập, bảo toàn log, báo owner ngay.
- P1: sai quyền, sai tiền/kho, upload trái case — ngừng luồng bị ảnh hưởng, tạo incident và kiểm tra audit.
- P2: lỗi UX hoặc báo cáo không nghiêm trọng — lập issue kèm bước tái hiện.

Sau sự cố phải có nguyên nhân gốc, phạm vi ảnh hưởng, biện pháp khắc phục và test hồi quy.
