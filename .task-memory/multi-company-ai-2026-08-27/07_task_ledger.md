# Task Ledger — Multi-company AI 2026-08-27

**Mục đích:** Đây là sổ kiểm tra bắt buộc cho nhiệm vụ dài. Không đánh dấu `DONE` nếu thiếu evidence tương ứng; `PASS` của code/test không thay thế runtime safety evidence.

## Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `DONE` | Đã hoàn tất và có evidence cụ thể, đã qua quality gate cần thiết. |
| `PARTIAL` | Có một phần code/evidence nhưng còn gate bắt buộc chưa đạt. |
| `BLOCKED` | Không thể tiếp tục an toàn vì thiếu quyền, dữ liệu, owner approval hoặc môi trường. |
| `NEXT` | Task kế tiếp được ưu tiên sau khi dependency đã đủ. |
| `NOT_STARTED` | Chưa triển khai. |

## Ledger tổng

| ID | Nhiệm vụ | Dependency | Trạng thái | Evidence/check path | Blocker/điều kiện hoàn tất | Next action |
|---|---|---|---|---|---|---|
| MC-00 | Brief, plan, state, decisions, sources và task ledger | Không | DONE | `.task-memory/multi-company-ai-2026-08-27/` | Duy trì sau mỗi wave | Cập nhật checkpoint trước khi kết thúc phiên |
| MC-02 | Company lifecycle DRAFT → ACTIVE → ARCHIVED và restore | MC-00 | DONE | PR #56, commit `98c62c1` | Runtime DB proof vẫn tách riêng | Kiểm chứng bằng DB fixture |
| MC-03 | Company-local account, membership, preset/capability, revoke | MC-02 | DONE | PR #57, commit `6e2efa8` | Authenticated walkthrough còn thiếu | Seed QA rồi walkthrough |
| MC-04 | Server-side module/direct URL tenant boundary | MC-03 | PARTIAL | PR #58, commit `63abd9e`; `checks/mc04-*` | Chưa có DB-backed foreign URL/revoked proof | MC-12 |
| MC-05 | Workspace context và AI legacy fail-closed boundary | MC-04 | PARTIAL | `v2-workspace-context.test.ts`, `ai-workspace-boundary.test.ts` | Chưa có authenticated runtime trace | MC-12/MC-10 |
| MC-07 | Project-local AI tools và business adapter | MC-04, MC-05, MC-09 | PARTIAL | PR #64, commit `2456982`; `checks/mc07-ai-read-full-summary.txt` | Mới có 3 read tools; chưa có mutation/approval adapter đầy đủ | Sau DB evidence, thiết kế mutation contract |
| MC-09 | AI con registry/lifecycle/control UI | MC-02, MC-03 | PARTIAL | PR #60, commit `8d1bcdc`; schema/UI tests | Chưa migration; chưa runtime health/heartbeat | MC-12 rồi MC-11 |
| MC-10 | AI runtime scope, agentId, allowlist và dispatcher gate | MC-05, MC-09 | PARTIAL | PR #62/#63, commits `6b14846`/`0e25f8e`; `checks/ai-runtime-release-summary.txt` | Chưa DB-backed two-company authenticated proof; message/job chưa có | MC-12 |
| MC-11 | AI Tổng control plane, bounded aggregate, child health/audit/usage | MC-10, MC-12 | NOT_STARTED | Chưa có | Cần explicit target, trace, timeout, idempotency và owner policy | Sau MC-12 |
| MC-12 | DB-backed synthetic QA two-company fixture + authenticated walkthrough | MC-03..MC-10 | PARTIAL | PR #61 pure fixture; PR #65 seed script; `checks/mc12-qa-seed-summary.txt` | Sandbox thiếu `QA_DATABASE_URL`; chưa chạy seed/walkthrough | Owner cung cấp PostgreSQL QA cô lập |
| MC-13 | Export/list/detail/foreign URL/revoked membership isolation proof | MC-12 | NOT_STARTED | Chưa có runtime artifact | Cần authenticated sessions và DB fixture | Sau seed QA |
| MC-14 | Additive Prisma migration, backup/rollback drill | MC-09, MC-12, owner approval | NOT_STARTED | Chưa tạo migration | Không chạy clinic DB; cần backup/rollback evidence | Sau schema acceptance |
| MC-15 | Payroll payout/accounting local và money safety gates | MC-03, MC-12, owner approval | NOT_STARTED | Chưa có settlement local | Cần owner approval, reconciliation, idempotency, no real payment | Sau isolation |
| MC-16 | Clinic deploy, Windows updater, health check, final acceptance | MC-12..MC-15, owner approval | BLOCKED | Chưa được phép deploy | Thiếu backup, migration, authenticated walkthrough và owner sign-off | Chỉ mở khi toàn bộ R3 gate pass |
| MEM-01 | Cập nhật checkpoint/state/changelog sau mỗi wave | Mọi task | NEXT | `02_state.md`, `06_changelog.md`, file này | Không được bỏ qua khi chuyển phase | Thực hiện cuối mỗi phiên |

## Checkpoint protocol

Trước khi làm task mới, kiểm tra `git status --short --branch`, đọc `02_state.md`, `01_plan.md`, `03_decisions.md`, `05_open_questions.md` và xác nhận dependency trong bảng này. Trước commit, chạy `git diff --check`, kiểm tra đúng branch, ghi test/evidence vào `checks/` và không stage `audit-evidence/` hoặc log ngoài phạm vi.

Sau mỗi wave, ghi lại commit/PR, test result, runtime result và blocker. Nếu một test fail, trạng thái task liên quan phải là `PARTIAL` hoặc `BLOCKED`, không được chuyển sang `DONE` chỉ vì build pass. Nếu thiếu DB, credentials, owner approval hoặc safety evidence, dừng ở code-level evidence và ghi rõ điều kiện mở khóa.

## Current checkpoint

| Mục | Giá trị |
|---|---|
| HEAD trước ledger branch | `2478a0a` — PR #65 đã merge |
| Branch hiện tại | `agent/mc-00-task-ledger-20260827` |
| Full quality status gần nhất | PR #64 và #65 CI pass; local Prisma/TSC/Vitest/Next build pass cho các wave đã chạy |
| DB runtime status | Chưa chạy; không có `DATABASE_URL` hoặc `QA_DATABASE_URL` trong sandbox |
| Production/clinic status | Chưa migration, chưa deploy, chưa chạm clinic DB |
| Immediate next action | Owner cung cấp QA PostgreSQL cô lập; nếu chưa có thì tiếp tục hoàn thiện contract/tool test nhưng không tuyên bố runtime proof |
