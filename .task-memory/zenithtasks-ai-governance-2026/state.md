# AI Governance Project State

- Updated: 2026-08-23 23:27 GMT+7
- Goal: Hoàn tất AI governance/Training Studio, sau đó quay lại V2, tự test trên máy người dùng và chỉ push bản đã kiểm nghiệm lên master.
- Current phase: Phase 2 — Hoàn tất AI Training Studio và workflow A/B/C/D
- Overall status: active

## Verified

Đã nghiên cứu và ghi lại pattern Cerbos PDP, Langfuse self-host prompt/evaluation/observability và OWASP Agentic Applications 2026 trong `research-findings.md` và `docs/AI-EXECUTIVE-GOVERNANCE-V3.md`.

Đã tạo `web/src/lib/ai-governance.ts`: policy thuần hàm phân loại L0–L5, project scope, capability, dữ liệu y tế/lương, chấm dứt nhân sự, thay đổi quyền, deploy production, deletion, confirmation, required approvals, rollback và field masking.

Đã tạo `web/src/lib/ai-approval-gate.ts`: preview có expiry, status, risk, consequence, affected records, amount, purpose và rollback. AI không tự chạy hành động L5; chấm dứt nhân sự/production/permission/delete yêu cầu workflow và 2 approvals theo default.

Đã thêm unit tests: policy 5/5 và approval 2/2 pass. Prisma validate/generate và TypeScript pass. Training Studio schema `ZAgentProfile`, `ZTrainingDataset`, `ZTrainingExample`, `ZPromptVersion`, `ZEvaluationRun` và migration `20260824003000_ai_training_studio` đã có. Trang `/he-thong/ai-dao-tao` có feature flag `ENABLE_AI_TRAINING_STUDIO` và dashboard tối thiểu.

## Open

- Chưa tích hợp policy gate vào agent tool dispatcher hiện có; mới có pure policy/approval contract.
- Chưa có UI CRUD đầy đủ cho dataset/prompt/evaluation; mới có dashboard/contract/docs.
- Chưa apply migrations trên DB thật.
- V2 cũ trên working tree từng không tồn tại dù lịch sử trước đó tưởng đã có; cần khôi phục/test từ repository thật trước push.

## Next actions

1. Nối `evaluateAiToolRequest` vào agent dispatcher/approval hiện tại mà không phá preview cũ.
2. Hoàn thiện Training Studio basic actions cho tạo agent profile/dataset/example và test dataset.
3. Quay lại khôi phục V2 thật: Dự án, tổ chức, mechanism registry, rule engine và AI clarification UI trong working tree hiện tại.
4. Dựng DB/data demo, chạy smoke test qua browser/local app, regression và webpack build.
5. Cập nhật handoff/README/AGENTS, commit/push master chỉ khi quality gate đạt.

## Quality risks

Không được coi `ADMIN` là bypass policy. Không log full medical/payroll values. Không cho AI tự chạy xóa/chấm dứt/deploy. Không dùng dữ liệu thật trong dataset. Không chạy migration production khi chưa có backup/dry-run.

Tác giả: Manus AI.


## Phase 2 checkpoint — 2026-08-23 23:29 GMT+7

Đã thêm `ai-training-actions.ts` với action ADMIN-only để tạo Agent Profile/Dataset/Prompt demo gồm 4 case không chứa dữ liệu thật: clarification A/B/C/D, cảnh báo L5 chấm dứt nhân sự, cảnh báo L2 dữ liệu y tế và từ chối vượt quyền. Action chỉ chạy khi `ENABLE_AI_TRAINING_STUDIO=true`, profile ở TESTING, examples chưa approved và không publish tự động.

Đã thêm `AiTrainingSeedButton` và hoàn chỉnh trang `/he-thong/ai-dao-tao`; feature flag tắt thì chỉ hiện hướng dẫn, bật thì có counts và nút tạo demo. Prisma validate/generate, TypeScript và 7 governance tests vẫn pass.

Còn thiếu: nối clarification payload vào AI agent hiện có, CRUD/evaluation UI thật và adapter Langfuse/Promptfoo/Cerbos. Các việc này sẽ làm sau khi bản V2 thật được khôi phục và test, để không trộn thêm rủi ro vào quality gate hiện tại.

## Recovery checkpoint — 2026-08-24 02:20 GMT+7

QA source-mounted đã xác nhận master working tree ban đầu không có các file V2/governance dù một snapshot trước đó có ghi nhận chúng. Đã tìm thấy và khôi phục schema V2/Training Studio từ snapshot `6b59c5919ea42f4c23ce1a0b9c6c228f04902d04`, cùng migration, route, rule engine, governance và Training Studio actions từ unreachable recovery commit `aecf5c0401b0a1abe3e7b3e4a4abc756164b1365`. Prisma validate/generate, TypeScript và 11 targeted tests pass sau khôi phục. Chưa commit/push; chưa apply migration vào database clinic thật.

## QA checkpoint — 2026-08-24 03:36 GMT+7

Đã chạy QA cô lập trên database `zenith_v2_qa`, không chạm database/volume clinic root. Migration V2 và Training Studio đã apply trong QA; dữ liệu demo gồm project CELLARISCA-DEMO, Sales unit/position, mechanism commission DRAFT, Training Profile TESTING, dataset active, prompt và 4 examples chưa approve. Authenticated HTTP smoke bằng ADMIN đạt `/dashboard`, `/du-an`, `/du-an/CELLARISCA-DEMO/to-chuc`, `/du-an/CELLARISCA-DEMO/co-che` và `/he-thong/ai-dao-tao` đều HTTP 200 với marker nội dung đúng.

Đã mint session tạm cho 6 role QA từ secret chỉ có ở local QA. ADMIN và MANAGER xem được dashboard/V2 project; ADMIN xem Training Studio; MANAGER và các role SHAREHOLDER/COLLABORATOR/RECEPTION/DOCTOR bị chặn Training Studio hoặc V2 bằng `khong-co-quyen` meta redirect. Harness QA tạm gọi đúng `seedV2DemoAction`: ADMIN trả `ok=true`, action upsert thành công và giữ policy DRAFT; MANAGER nhận HTTP 307 tới `/khong-co-quyen`. Route debug/harness đã xóa khỏi source trước quality gate. QA phải được xem là bằng chứng isolated, không phải production migration.

Clarification A/B/C/D đã có pure contract + 4 tests và UI button cards; metadata được lưu trong conversation, lựa chọn tạo draft inactive có evidence, không activation. Training Studio hiện chỉ là dashboard + demo seed; CRUD/evaluation/release UI đầy đủ vẫn deferred và phải ghi rõ trong docs.

## Current quality-gate phase — 2026-08-24 03:36 GMT+7

- Current phase: Phase 5 — regression, security, build, rollback và cập nhật hồ sơ bàn giao.
- Completed: source review, QA migration/data, feature-on/off smoke, role smoke, authenticated server-action harness, clarification UI/typecheck/targeted tests.
- Next 3 actions: chạy full Prisma/typecheck/Vitest/webpack build; review security/secret/staged diff và cập nhật docs/handoff; chỉ sau đó stage explicit files, commit/push nếu mọi gate đạt.
- Open risks: cần kiểm chứng full build thật, không dựa vào log compile; cần loại toàn bộ QA artifacts khỏi staging; L5 two-person workflow và Training Studio CRUD/evaluation/release chưa delivered; production migration vẫn pending backup/dry-run/explicit confirmation.

## Release checkpoint — 2026-08-24 03:58 GMT+7

Quality gate cuối đạt: `prisma validate`, `prisma generate`, `npx tsc --noEmit`, full Vitest **75 files / 397 tests**, và `npm run build -- --webpack` hoàn tất thành công. Cached diff check và allowlist audit đạt; intended product files đã commit, không stage checks/worktrees/token/env/recovery artifacts.

Commit `128b0889a918e9a1e5314457b2e5bd4b551b77b9` đã push thành công lên `origin/master`; `git ls-remote origin refs/heads/master` trả cùng SHA. Các thay đổi Windows local và `.task-memory/02_state.md`, `.task-memory/06_changelog.md` cũ vẫn ngoài commit, không bị xóa hoặc đưa vào release.

Goal của phiên này hoàn tất. Production clinic vẫn chưa migrate hai migration V2/Training và feature flags chưa được bật trên máy vận hành. Người dùng chỉ nên backup trước, chạy `windows\\Sua-Loi.bat` để cập nhật commit, sau đó kiểm tra workflow clinic trước khi cân nhắc migration/flags theo runbook; không dùng `prisma db push` hoặc `migrate reset`.


## Workspace V4 checkpoint — 2026-08-26 13:45 GMT+7

Đã push commit `27bb015a05010e56715d7e325f7543f208ada7e9` lên `origin/master`. Commit này bổ sung context AI `GLOBAL`, guard Admin-only/explicit project target và migration additive `20260826100000_ai_global_workspace`; sandbox đã xác minh Prisma generate, 11 governance tests và Next build thành công.

Đã tiếp tục P03/P04 nền trong working tree sandbox: migration additive `20260826110000_workspace_core_modules`; các model `ZWorkspaceCustomer`, `ZWorkspaceAppointment`, `ZWorkspaceSale` có `projectId` bắt buộc, index/unique theo project và foreign key tới `ZProject`. Đã tạo `createWorkspaceCustomerAction` với `requireProjectAccess`, không nhập số điện thoại đầy đủ, audit và revalidate; trang `/du-an/[projectId]/khach-hang` chỉ query `ZWorkspaceCustomer`; registry chuyển Customer thành module available với route local. Đã thêm rollback-only SQL check `checks/test-workspace-core-isolation.sql` để kiểm chứng hai project không đọc chéo và bảng legacy `Customer` không đổi.

Bằng chứng sandbox: `prisma validate`, `prisma generate`, direct `tsc --noEmit`, `vitest run src/lib/ai-governance.test.ts` **11/11 pass**, `next build` pass và route `/du-an/[projectId]/khach-hang` được compile. Lần chạy `pnpm exec tsc --noEmit` bị chặn bởi pnpm policy `ERR_PNPM_IGNORED_BUILDS`, sau đó direct local `node_modules/.bin/tsc --noEmit` pass; đây là lỗi quy trình dependency, không phải TypeScript.

Trạng thái: commit Customer foundation chưa commit/push/deploy; cần review diff, commit/push, rồi chờ sidecar Windows kết nối để chạy đúng `windows\\Sua-Loi.bat`. Chưa được tuyên bố Customer hoàn chỉnh: còn edit/soft-delete/consent/detail/history; Appointment/Sales/Finance/Payroll vẫn chưa có action/UI đầy đủ. Không được gọi toàn bộ Dự án là usable hoàn chỉnh.

Next 3 actions:
1. Review migration SQL/diff, thêm targeted static/isolation tests nếu cần, commit/push Customer foundation.
2. Khi clinic reconnect, kiểm tra SHA/compose rồi chạy `Sua-Loi.bat`, xác minh migration 59 và `/login` 200; không merge local schema experiment.
3. Tiếp tục P03/P04 theo thứ tự: customer edit/detail, appointment local, sale/ledger local; sau mỗi mốc chạy build/test và cập nhật checkpoint.


## Deploy checkpoint — 2026-08-26 14:20 GMT+7

Clinic Windows đã nhận `origin/master` tại `0f07a8e5c3656914e93b577c3d267b98f96b3158`. Lần chạy `windows\\Sua-Loi.bat` hardened đã đi qua checkout, Docker build, recreate app, migration và báo `DA XONG`; bằng chứng tóm tắt lưu tại `checks/workspace-core-deploy-20260826.md`.

Runtime hậu kiểm: app `running`, DB `running/healthy`, `/login` HTTP 200; `docker compose exec -T app npx prisma migrate status` trả `60 migrations found` và `Database schema is up to date!`. Source clinic có route Customer và migration `20260826110000_workspace_core_modules`. Local QA state/worktrees còn được giữ ngoài commit; tracked patch cũ đã nằm trong stash, không tự động pop.

Updater issue đã được sửa và kiểm chứng: untracked path xung đột incoming tracked migration trước đây làm checkout fail; bản `0f07a8e` chuyển riêng các path xung đột ra backup ngoài repo, không xóa untracked/ignored, sau đó build thành công.

Chưa authenticated browser walkthrough vì owner chưa thực hiện bước đăng nhập. Chưa được tuyên bố toàn bộ Dự án hoàn chỉnh: Customer mới là foundation create/list; Appointment/Sales/Ledger/Finance/Payroll/layout/Global console/proposal workflow vẫn mở.


## Project operations checkpoint — 2026-08-26 18:30 GMT+7

Đã thêm module Doanh số project-local: `createWorkspaceSaleAction` xác minh project/customer, giới hạn số tiền và điều kiện PAID, ghi audit `ZWorkspaceSale`; trang `/du-an/[projectId]/doanh-so` tổng hợp tổng giá trị/đã thu và liệt kê giao dịch theo projectId. Registry thêm key `sales` và route local; Finance ledger vẫn chưa mở.

Đã thêm/hoàn chỉnh Lịch hẹn project-local ở commit `c4cb1fa`: create, assignee/customer cùng project, conflict trong khoảng ±30 phút và cập nhật trạng thái có audit. Build sandbox sau đó pass với các route `/lich-hen` và `/doanh-so`.

Bằng chứng code hiện tại: `prisma generate`, direct `tsc --noEmit`, governance tests **11/11**, `next build` pass. Chưa deploy commit Doanh số mới lên clinic; cần commit/push rồi chạy `Sua-Loi.bat`. Doanh số hiện chưa phải ledger/đối soát immutable đầy đủ và chưa có period filter; Customer edit/consent/detail/history, Finance, Payroll vẫn mở.


## 60-task coverage audit checkpoint — 2026-08-26

Theo phản hồi của người dùng, đã rà soát lại source-of-truth kế hoạch: kiểm tra thực tế cho kết quả `TASK_ROWS=60`, `TASK_UNIQUE=60`, đúng cấu trúc 10 phase × 6 task. Không task nào bị xóa hoặc thay thế bởi bản điều phối 6 phase. Bảng đối chiếu yêu cầu ban đầu → task → bằng chứng/giới hạn được lưu tại `checks/60-task-coverage-audit-20260826.md`.

Trạng thái kiểm kê: 6 `done`, 20 `review`, 34 `not_started`, không có `blocked`/`cancelled`. Các mục còn thiếu đã được ghi rõ: Customer edit/consent/detail/history, Finance/Ledger, Payroll/Commission, layout version/rollback/drag-drop, Global console scale, AI configuration proposal apply, QA seed/walkthrough và final handoff. Runtime updater Doanh số vẫn có process đang chạy; không khởi chạy chồng lấn và sẽ hậu kiểm sau khi process kết thúc.


## Config version foundation checkpoint — 2026-08-26

Đã thêm `ZWorkspaceConfigKind`, `ZWorkspaceConfigStatus` và model `ZWorkspaceConfigVersion` với `projectId`, version unique theo project/kind, effective time, JSON config, creator/approver và status draft/active/superseded/rolled-back. Migration additive là `20260826120000_workspace_config_versions`; Prisma validate/generate và direct TypeScript pass. Task P03-T02 được chuyển sang `review` vì nền schema đã có nhưng action preview/activation/rollback và UI chưa triển khai.


## Config version UI checkpoint — 2026-08-26

`updateProjectModulesAction` hiện tạo version MODULES mới trong transaction, supersede version ACTIVE trước, cập nhật `ZProject.enabledFeatures` để tương thích các loader hiện hữu và ghi audit kèm `configVersion`. Dự án mới tạo version MODULES 1 ACTIVE cùng lúc tạo project/member. Dashboard hiển thị 5 version gần nhất theo project.

Sandbox verification sau thay đổi: Prisma generate pass, TypeScript pass, governance test **11/11**, Next production build pass và route list không lỗi. P03-T02 vẫn `review`: chưa có preview/rollback action và UI dành riêng cho rollback; không coi manual Admin save là full approval workflow.


## Updater reliability checkpoint — 2026-08-26

Phản hồi của người dùng về việc không để browser/tab/process treo đã được ghi vào quy tắc vận hành của kế hoạch. Updater `windows/Sua-Loi.ps1` được harden thêm: build Docker dùng cache an toàn theo mặc định để giảm thời gian và phụ thuộc mạng; có thể chủ động đặt `ZENITH_FORCE_NO_CACHE=true` khi thật sự cần rebuild toàn bộ. Vẫn giữ `COMPOSE_BAKE=false`, redirect log, kiểm tra exit code, không `git clean`, không xóa volume/database.

Bản hardening đã qua `git diff --check` và push master tại `90f6bef`. Lần triển khai Doanh số trước đó bị dừng vì no-cache build đứng ở base-image apt; app/db clinic vẫn running/healthy và `/login` 200. Commit Doanh số và config-version vẫn cần một lần updater thành công để ghi runtime evidence.
