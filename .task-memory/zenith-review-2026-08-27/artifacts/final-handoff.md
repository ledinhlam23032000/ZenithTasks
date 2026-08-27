# Bàn giao — Rà soát và hoàn thiện Workspace V4

**Ngày:** 2026-08-27 GMT+7  
**Master sau hợp nhất:** `1bfb80f`  
**Pull requests:** [#53 — layout + AI boundary](https://github.com/ledinhlam23032000/ZenithTasks/pull/53), [#54 — production demo guard](https://github.com/ledinhlam23032000/ZenithTasks/pull/54)

## Kết luận điều hành

Đợt rà soát đã xác nhận dự án **chưa đạt trạng thái vận hành độc lập hoàn toàn** theo đặc tả Workspace V3/V4. Tuy nhiên, các lỗi kỹ thuật an toàn và có thể chứng minh bằng test đã được sửa và hợp nhất vào `master`. Những phần còn lại chủ yếu là runtime/deploy gate, tích hợp nghiệp vụ nhạy cảm và quyết định của owner; không nên giả vờ hoàn tất bằng cách nhìn vào route hoặc build xanh.

## Đã kiểm tra

| Hạng mục | Kết quả | Evidence |
|---|---|---|
| Checkout code | Origin sạch tại `3bc85d1`; Windows `5d38fc0` là ancestor nhưng chậm 63 commit, có untracked artifacts | Brief/state |
| Prisma | `validate` và `generate` pass | `audit-evidence/final-prisma-*.log` |
| TypeScript | `tsc --noEmit` pass sau thay đổi | `audit-evidence/demo-guard-tsc.log` |
| Unit/regression | Baseline 83 files/422 tests; sau sửa 84 files/428; cuối cùng 85 files/429 tests pass | `audit-evidence/final-vitest.log`, `demo-guard-full-vitest.log` |
| Production build | `next build` pass ở baseline, sau layout/AI sửa và sau demo guard | `audit-evidence/final-next-build.log`, `demo-guard-next-build.log` |
| CI | PR #53 và #54 đều pass cả push và pull_request checks | GitHub Actions của hai PR |
| Migration/clinic runtime | Chưa chạy, đúng safety gate | Không có claim deploy |

## Đã sửa và đã merge

**Applied layout.** Server layout loader đọc config version `LAYOUT` đang `ACTIVE`, chuẩn hóa theo module available/enabled và truyền `layoutOrder` vào AppShell. Project navigation dùng thứ tự đã áp dụng nhưng vẫn lọc planned/disabled module. Layout editor bắt đầu từ order hiện hành. Server-side APPLY từ chối order rỗng, duplicate, unknown, planned hoặc thiếu module; regression test đã khóa các trường hợp này.

**AI workspace fail-closed.** `INTERNAL` vẫn dùng các legacy clinic actions. `GLOBAL` chỉ được dùng aggregate `get_workspace_overview`. `PROJECT` và `GLOBAL` không còn được phép rơi vào legacy read/write actions; server chặn cả lúc tạo approval và lúc xác nhận approval cũ. Khi ở Project, dispatcher cũng không truy vấn danh sách nhân sự Internal trước khi planner chạy.

**Demo seed production guard.** Seed `CELLARISCA-DEMO` bị chặn server-side khi `NODE_ENV=production`; đã thêm regression test cho `test`, `development` và `production`. Payroll vẫn giữ `available: false` vì chưa có payout/accounting project-local.

## Chưa đạt hoặc chưa thể tự đóng

| Mức | Hạng mục | Lý do chưa đóng |
|---|---|---|
| Critical | Authenticated Admin/Manager walkthrough và isolation runtime | Cần owner đăng nhập và cho phép chạy trên môi trường QA; unit tests không đủ thay thế |
| Critical | Migration/backup/updater clinic | Checkout Windows chậm 63 commit và có untracked artifacts; không tự reset/clean/pull hay chạy updater clinic |
| Critical | Payroll settlement | Có calculation/two-person approval/finalize/void nhưng chưa có payout/accounting local; cần owner quyết định contract |
| Critical | AI business adapters project-local | Hiện chỉ có aggregate Global; các nghiệp vụ Customer/Appointment/Sales/Finance/Payroll chưa được nối vào AI bằng `ZWorkspace*` tools |
| High | Layout rollback UI và runtime DB proof | Code đã đọc/apply active layout nhưng chưa được kiểm chứng bằng DB/runtime thật |
| High | Isolation integration tests | Chưa có synthetic DB fixture hai project chứng minh list/detail/aggregate không đọc chéo trên runtime |
| High | Canonical project memory/workbook | Workbook quy định không tồn tại trong sandbox; kế hoạch V4 đang lệch giữa Windows untracked và origin |
| Medium | Demo copy/QA separation | Action đã bị chặn production, nhưng cần tiếp tục cô lập UI/seed QA để không lẫn với project vận hành thật |

## Việc owner cần thực hiện ở phiên kế tiếp

Owner cần backup và cập nhật checkout Windows bằng quy trình updater an toàn lên `origin/master` mới, đồng thời giữ nguyên `.task-memory`, `_qa-latest-candidate`, `checks/test-task-isolation.sql` và `worktrees/`. Sau đó cần chạy migration status, health check và authenticated walkthrough trên môi trường đã cho phép; tuyệt đối không ghi/xóa nghiệp vụ thật trong lần test đầu tiên.

Sau runtime gate, cần chốt một trong hai hướng cho payroll: triển khai settlement project-local có approval/audit/rollback, hoặc giữ module unavailable và ghi rõ trong roadmap. Cuối cùng cần quyết định nơi lưu workbook/state canonical để các phiên sau không lặp lại audit và không lệch trạng thái.

## Safety statement

Không có migration clinic, không reset database/volume, không dùng credential, không tạo transaction/lương thật và không xóa dữ liệu trong đợt này. Trạng thái đúng là **đã sửa một phần có bằng chứng; còn blocker runtime và nghiệp vụ nhạy cảm**.
