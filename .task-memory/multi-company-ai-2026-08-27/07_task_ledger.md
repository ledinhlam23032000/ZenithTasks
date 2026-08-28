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
| MC-09 | AI con registry/lifecycle/control UI | MC-02, MC-03 | PARTIAL | PR #60, commit `8d1bcdc`; schema/UI tests; QA verifier | Additive hierarchy migration verified only on independent QA; clinic migration/health/heartbeat not proven | MC-11 after runtime scope evidence |
| MC-10 | AI runtime scope, agentId, allowlist, dispatcher gate và Global observability | MC-05, MC-09 | PARTIAL | PR #62/#63; PR #87 Global AI observability; QA verifier/auth walkthrough; `checks/mc13-1-credential-wave-20260828.md` | Route scope and read-only dashboard proven; heartbeat is currently missing in fixture, usage model, dispatcher child/global E2E and message/job orchestration remain | MC-11 |
| MC-11 | AI Tổng control plane, bounded aggregate, child health/audit/usage | MC-10, MC-12 | PARTIAL | PR #87 read-only dashboard; corrective contract + persistence code in `checks/mc11-contract-persistence-wave-20260828.md` | Contract/persistent enqueue foundation is code-level only; no QA migration, dispatcher/worker, runtime reauthorization E2E, usage/heartbeat or child control proof | Run full gates, review/apply additive migration only on isolated QA, then separately implement dispatcher reauthorization |
| MC-12 | DB-backed synthetic QA multi-company fixture + authenticated walkthrough | MC-03..MC-10 | DONE | PR #61/#65; QA `mc13-1-stable-credential-seed.json`; `mc13-1-stable-credential-verifier.json`; `mc13-1-auth-stable-usernames-final.json` | QA-only seed/verifier/GET-export evidence complete; production/clinic remains separate | Duy trì QA fixture và không dùng secret trong repo |
| MC-13 | Export/list/detail/foreign URL/revoked membership isolation proof | MC-12 | PARTIAL | PR #78 export routes; PR #86 QA client harness; `checks/mc13-1-credential-wave-20260828.md`; QA `mc13-1-auth-stable-usernames-final.json` | Foreign/revoked/DRAFT/ARCHIVED/capability route and customer/task export isolation proven on QA; authenticated DRAFT/ARCHIVED write-denial remains blocked by browser connector, direct synthetic POST inconclusive | Reconnect browser and submit QA-only harness; do not weaken guard |
| MC-14 | Additive Prisma migration, backup/rollback drill | MC-09, MC-12, owner approval | PARTIAL | Additive draft `web/prisma/migrations/20260828130000_ai_job_contract/migration.sql`; no QA apply yet | Migration draft exists, but no isolated QA apply, backup, rollback drill or owner approval; clinic remains untouched | Review SQL and run only guarded QA migration after CI/backup gate |
| MC-15 | Payroll payout/accounting local và money safety gates | MC-03, MC-12, owner approval | NOT_STARTED | Chưa có settlement local | Cần owner approval, reconciliation, idempotency, no real payment | Sau isolation |
| MC-16 | Clinic deploy, Windows updater, health check, final acceptance | MC-12..MC-15, owner approval | BLOCKED | Chưa được phép deploy | Thiếu backup, migration, authenticated walkthrough và owner sign-off | Chỉ mở khi toàn bộ R3 gate pass |
| MEM-01 | Cập nhật checkpoint/state/changelog sau mỗi wave | Mọi task | NEXT | `02_state.md`, `06_changelog.md`, file này, `checks/mc11-contract-persistence-wave-20260828.md` | Không được bỏ qua khi chuyển phase | Commit corrective wave only after diff/gates; preserve untracked historical artifacts |

## Checkpoint protocol

Trước khi làm task mới, kiểm tra `git status --short --branch`, đọc `02_state.md`, `01_plan.md`, `03_decisions.md`, `05_open_questions.md` và xác nhận dependency trong bảng này. Trước commit, chạy `git diff --check`, kiểm tra đúng branch, ghi test/evidence vào `checks/` và không stage `audit-evidence/` hoặc log ngoài phạm vi.

Sau mỗi wave, ghi lại commit/PR, test result, runtime result và blocker. Nếu một test fail, trạng thái task liên quan phải là `PARTIAL` hoặc `BLOCKED`, không được chuyển sang `DONE` chỉ vì build pass. Nếu thiếu DB, credentials, owner approval hoặc safety evidence, dừng ở code-level evidence và ghi rõ điều kiện mở khóa.

## Current checkpoint

| Mục | Giá trị |
|---|---|
| HEAD trước ledger branch | `3879e11` — PR #89 preliminary job contract; corrective/persistence wave đang uncommitted trên dedicated branch |
| Branch hiện tại | `agent/mc-11-2-persistent-ai-job-20260828`; QA runtime worktree riêng trên Windows |
| Full quality status gần nhất | Corrective wave: Prisma validate/generate PASS, TSC PASS, focused Vitest 1 file/6 tests PASS; full Vitest/Next build/CI chưa chạy cho wave này |
| DB runtime status | QA độc lập seed/verifier/auth GET-export pass với role usernames; client write-denial page đã build nhưng browser submit còn blocked; ZAiJob migration chưa apply QA; không có clinic DB access |
| Production/clinic status | Chưa migration, chưa deploy, chưa chạm clinic DB |
| Immediate next action | Chạy full gates và review migration; sau đó mới guarded QA apply nếu đủ safety gate. Reconnect browser để submit QA-only DRAFT/ARCHIVED forms; không đánh dấu MC-13 DONE khi thiếu write evidence |

## Latest audit checkpoint — 2026-08-27 16:50 GMT+7

| Checkpoint | Kết quả |
|---|---|
| Objective audit | Đã lập và merge PR #67; ma trận ở `artifacts/objective-audit-20260827.md`. |
| Current master | `fc30332`, PR #68 đã merge; CI của các PR #60–#68 pass theo từng wave. |
| Quality code gate | Prisma validate/generate, TSC, Vitest và Next build gần nhất đều pass theo evidence đã lưu. |
| QA seed | PR #65 đã merge; seed guarded, idempotent, non-PII, không delete/reset. |
| QA verifier | PR #68 đã merge; verifier read-only đã compile nhưng chưa chạy DB do thiếu `QA_DATABASE_URL`. |
| Production/clinic | Chưa migration, backup production, updater Windows hoặc deploy; trạng thái đúng là blocked bởi owner gate. |
| Next canonical action | QA seed → verifier → authenticated walkthrough đã pass; giữ MC-13 `PARTIAL` vì export/list-detail/aggregate và write-denial evidence chưa hoàn tất; không tuyên bố production proof. |
