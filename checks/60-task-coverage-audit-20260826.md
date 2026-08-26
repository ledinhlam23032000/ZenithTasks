# Biên bản rà soát đủ 60 task — 2026-08-26

## Kết quả kiểm kê kế hoạch

| Kiểm tra | Kết quả |
|---|---:|
| Số dòng task hợp lệ | 60 |
| Số mã task duy nhất | 60 |
| Cấu trúc | 10 phase × 6 task |
| `done` | 6 |
| `review` | 20 |
| `not_started` | 34 |
| `blocked` / `cancelled` | 0 |

Kế hoạch chuẩn vẫn là `.task-memory/zenithtasks-ai-governance-2026/01_plan-workspace-v4-60-tasks.md`. Bản điều phối ngắn 6 phase trước đó chỉ là lớp điều phối tạm thời; nó không thay thế và không được dùng để kết luận số lượng task của dự án.

## Đối chiếu yêu cầu ban đầu

| Yêu cầu người dùng | Task bao phủ | Bằng chứng/trạng thái hiện tại | Phần chưa được phép tuyên bố hoàn tất |
|---|---|---|---|
| Giữ nguyên toàn bộ dữ liệu Nội Bộ và không trộn dữ liệu | P01-T02, P01-T04, P02-T04, P03-T03–T06, P04-T06, P05-T06, P09-T04, P10-T03 | Có đặc tả legacy/local, migration additive, Customer/Appointment/Sale local và SQL rollback isolation check nền | Chưa có isolation evidence đầy đủ cho Finance/Payroll/Mechanism và authenticated end-to-end |
| Workspace selector nằm dưới tên bệnh viện; Nội Bộ ↔ Dự án; Dự án ẩn menu Nội Bộ | P01-T03, P06-T01–T06 | Selector, route và project-only `visibleNav` đã có; test runtime đầy đủ còn mở | Chưa có authenticated browser walkthrough; mobile drawer/bottom-nav còn mở |
| Mỗi Dự án là app trong app, có module, trường, dữ liệu, task, doanh số và quyền riêng | P01-T04–T05, P03-T01–T06, P04-T01–T06, P05-T01–T06, P06-T03–T04 | Customer, Lịch hẹn, Doanh số, Task đã có nền project-local; access checks server-side | Finance/Ledger, Payroll/Commission, detail/edit/consent/history và module layout chưa hoàn thiện |
| Có thể thêm/bật/tắt/sắp xếp chức năng bằng kéo-thả hoặc AI | P03-T02, P06-T03, P07-T01–T06, P08-T03–T04 | Registry và bật/tắt module nền đã có | Version/rollback layout, drag-drop accessible và AI configuration proposal chưa triển khai |
| Global Admin xem/điều phối mọi Dự án, kể cả quy mô lớn | P02-T02, P02-T05, P07-T04–T05, P08-T01–T02 | AI GLOBAL aggregate overview và explicit target đã có guard; giới hạn overview 2.000 project/hiển thị 100 | Global console UI, pagination/cursor/groupBy scale và universal project tools còn mở |
| AI là “bộ não thứ hai” nhưng phải có context, preview, approval, audit; L5 không được tự làm nguy hiểm | P02-T01–T06, P08-T01–T06 | Governance tests 11/11; GLOBAL selector/guard; L5 block/two-approval contract hiện có | Two-person approval workflow thật và apply proposal an toàn chưa hoàn tất |
| Manager chỉ thấy Dự án được gán, không thấy dữ liệu Dự án khác | P02-T03–T04, P09-T03 | Membership active/server guard đã có và được test nền | Authenticated Manager walkthrough chưa chạy |
| Dữ liệu giả/QA cô lập, có role để tự test | P09-T01–T06 | QA workflow cũ có isolated DB/role seed; core SQL test rollback-only | Seed cập nhật Customer/Appointment/Sale và walkthrough mới chưa hoàn thành |
| Bấm `Sua-Loi.bat` phải cập nhật thật, không bắt người dùng dò lỗi | P10-T01–T06 | Updater đã sửa lỗi untracked conflict; các lần deploy trước đạt `DA XONG`, app/DB healthy, SHA khớp | Deploy commit Doanh số đang được theo dõi; cần hậu kiểm cuối và ghi evidence |
| Viết tài liệu để thế hệ sau tiếp quản | P01-T06, P08-T06, P09-T06, P10-T05–T06 | Kế hoạch 60 task, đặc tả workspace, checkpoint và deploy evidence đã có | Handoff cuối chỉ làm sau khi các quality gate còn lại đạt hoặc được ghi là open |

## Kết luận kiểm kê

Không có task nào bị xóa khỏi kế hoạch 60 task. Sáu task đầu tiên đã có bằng chứng hoàn tất. Hai mươi task đang ở `review` vì có nền code/test nhưng chưa đạt tiêu chí V4 đầy đủ. Ba mươi bốn task chưa bắt đầu, chủ yếu là Ledger/Finance/Payroll, layout kéo-thả, Global console, AI proposal apply, QA walkthrough và final handoff. Dự án vẫn ở trạng thái **active**, chưa đủ điều kiện gọi là sản phẩm project độc lập hoàn chỉnh.
