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
