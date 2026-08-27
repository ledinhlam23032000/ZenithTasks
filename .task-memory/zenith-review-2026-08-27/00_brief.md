# Brief — Rà soát và hoàn thiện Workspace V4

- **Ngày bắt đầu:** 2026-08-27 GMT+7
- **Mục tiêu:** rà soát lại dự án ZenithTasks theo đặc tả Workspace V3/V4, kiểm chứng bằng mã nguồn và quality gates, liệt kê các mục tiêu chưa đạt, sau đó tiếp tục sửa các hạng mục còn thiếu với bằng chứng.
- **Nguồn sự thật kỹ thuật:** checkout sạch từ `origin/master` tại commit `3bc85d1`; checkout Windows `C:\Users\PC\ZenithTasks` đang ở `5d38fc0`, không có commit riêng và đang chậm `63` commit, có untracked artifacts nên không reset/clean.
- **Phạm vi:** Workspace switch/boundary, project-local Customer/Appointment/Sales/Finance/Payroll/Mechanism/Task, layout/config, Global Admin/AI, isolation, regression, migration safety và runtime evidence.
- **Không làm:** không chạy migration trên database clinic, không reset/xóa volume, không dùng dữ liệu thật, không tự nhập credential, không đánh dấu done nếu thiếu acceptance/evidence.
- **Tiêu chí thành công:** có danh sách gap có mức độ và bằng chứng; các gap có thể sửa an toàn được triển khai trên branch riêng; quality gates chạy lại; checkpoint, changelog và report được lưu.
- **Ghi chú:** workbook canonical được skill yêu cầu không hiện diện ở `/home/ubuntu/task-memory/zenith-upgrade-execution`; kế hoạch 60 task hiện có trong `.task-memory/zenithtasks-ai-governance-2026/` của checkout Windows nhưng không được version-control ở origin. Vì vậy audit dùng đặc tả `docs/WORKSPACE-V3-REAL-PROJECT.md`, kế hoạch 60-task của nhiệm vụ tham chiếu và mã nguồn thực tế; mọi thiếu hụt nguồn canonical được ghi rõ, không suy đoán.
