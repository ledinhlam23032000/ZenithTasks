# Project State

- Updated: 2026-08-26 12:35 GMT+7
- Goal: Hoàn thiện ZenithTasks thành nền tảng đa workspace có Dự án vận hành độc lập, menu/dữ liệu tách khỏi Nội Bộ, Global Admin và AI có quyền toàn cục nhưng có governance, rồi kiểm thử đăng nhập và deploy thật.
- Current phase: P01/P02 — đặc tả 60 task và triển khai boundary/global context
- Overall status: active

## Completed since last checkpoint

- Đã push master `4f0cc65` với AI workspace scope và hậu kiểm updater clinic đạt `DA XONG`, migration 58, app Ready, `/login` 200.
- Đã push master `342c5c5` với đặc tả `WORKSPACE-V3-REAL-PROJECT.md`, AppShell ẩn menu Nội Bộ khi active Project và kế hoạch chính xác 60 task.
- Đã tạo plan `01_plan-workspace-v4-60-tasks.md`; kiểm tra `TASK_COUNT=60`, `UNIQUE_COUNT=60`.

## Verified facts

- Nội Bộ vẫn dùng dữ liệu clinic legacy; không có chủ trương di chuyển/copy dữ liệu.
- Task hiện có model project-local; Customer, Appointment, Sales/Finance, Payroll project-local chưa hoàn thiện.
- AI hiện có INTERNAL/PROJECT scope; chưa có GLOBAL enum/tool triển khai hoàn chỉnh.
- Máy clinic còn untracked `checks/test-task-isolation.sql` và `worktrees/`; không được xóa hoặc stage.

## Decisions made

- Chia công việc thành 60 task, 10 phase × 6 task; mỗi task chỉ done khi có evidence.
- Dự án không còn được mô tả là demo/trial; DRAFT nếu dùng chỉ là trạng thái cấu hình, ACTIVE mới nhận nghiệp vụ thật.
- Global Admin/AI có thể nhìn và điều phối mọi project qua aggregate/batch scope, nhưng không bỏ qua preview, approval, audit và L5 blocker.
- Không thêm projectId nullable bừa bãi vào model clinic legacy; tạo họ model project-local theo module.

## Open blockers/questions

- Cần triển khai P02-T01/P02-T05: GLOBAL context và global overview tool cho Admin.
- Cần hoàn thiện P03–P05 để Dự án có Customer, Appointment, Sales/Finance, Payroll/Mechanism local thật.
- Cần authenticated Admin/Manager browser walkthrough; owner sẽ nhập credential, agent chỉ thao tác sau đó.
- L5 two-person approval chưa triển khai.

## Next 3 actions

1. Hoàn thiện schema/migration additive cho GLOBAL AI context và action overview aggregate.
2. Hoàn thiện AppShell/global console và bỏ toàn bộ copy demo/trial khỏi màn hình Dự án.
3. Tạo test synthetic multi-project, chạy build/unit và lập checkpoint trước khi triển khai clinic.

## Files to read first

- `.task-memory/zenithtasks-ai-governance-2026/01_plan-workspace-v4-60-tasks.md`
- `docs/WORKSPACE-V3-REAL-PROJECT.md`
- `web/src/components/layout/app-shell.tsx`
- `web/src/app/(app)/tro-ly/agent.ts`
- `web/src/lib/ai-governance.ts`
- `web/prisma/schema.prisma`

## Quality risks

- Không được nhầm quyền Admin global với việc cho phép tool cũ đọc nhầm dữ liệu Nội Bộ.
- Không được đánh dấu module available trước khi có schema/action/UI/isolation evidence.
- Không deploy migration khi chưa validate/generate/build/test và chưa chạy updater thật.
