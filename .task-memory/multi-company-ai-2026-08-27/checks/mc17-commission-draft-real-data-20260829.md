# MC-17 — generate_commission_draft dùng dữ liệu THẬT — 2026-08-29

## Vấn đề
Tool AI con `generate_commission_draft` nhận thẳng `amount`/`rate` do AI (caller) tự đưa vào rồi
`amount * rate/100` — không đọc DB, có thể bịa số tuỳ ý. Đây là ví dụ cụ thể chủ dự án phê bình:
"chỉ để đẹp số liệu chưng cho đẹp".

## Điều tra kiến trúc trước khi sửa
Có 2 "rule engine" khác nhau trong V2, dễ nhầm:
- `lib/v2-rule-engine.ts` (`simulateV2RuleSpec`, `V2RuleSpec` — percentage/fixed/threshold/tiered/split):
  chỉ được gọi trong chính test file của nó — **CHƯA được nối vào bất kỳ money path thật nào.**
- `lib/v2-payroll-calculation.ts` (`parsePayrollRuleSpec`/`calculateCommissionPreview` — dạng đơn giản
  `{basis, rateBps, allocation}`): đây mới là engine THẬT — được `v2-mechanism-actions.ts`
  (`runMechanismRuleTests`) dùng để test cơ chế trước khi ACTIVATE, và được `v2-payroll-actions.ts`
  dùng để tính PayrollRun thật (MC-15).

→ Kết luận: phải nối `generate_commission_draft` vào `parsePayrollRuleSpec`/`calculateCommissionPreview`
(engine thật), KHÔNG dùng `v2-rule-engine.ts` (chưa phải money path thật) và KHÔNG dùng
`lib/commission.ts` (đó là công thức RIÊNG của clinic Hồng Phúc — bác sĩ/điều dưỡng/tư vấn viên — không
áp dụng được cho company V2 loại DISTRIBUTION/SERVICE/OTHER).

## Đã sửa
- `v2-ai-tool-schemas.ts`: `GenerateCommissionDraftSchema` bỏ hẳn `amount`/`rate` — chỉ còn
  `{salesCode, note?}`. AI không còn cách nào tự đưa số tiền/tỷ lệ.
- `v2-ai-job-engine.ts` (`generate_commission_draft`): tra `ZWorkspaceSale` thật theo
  `{projectId, code: salesCode}` → lấy `paidAmount` thật; tra `ZMechanismVersion` đang `ACTIVE` (kind
  `COMMISSION`) của đúng company → lấy `rateBps` thật qua `parsePayrollRuleSpec`; tính
  `Math.floor(paidAmount * rateBps / 10000)` — **đúng công thức** `calculateCommissionPreview` đang
  dùng cho tiền thật. Chỉ hỗ trợ `basis:"SALE_PAID"` (per-sale); `INCOME_LEDGER` là basis theo TỔNG kỳ,
  không map được cho 1 giao dịch đơn lẻ → trả lỗi rõ ràng thay vì tính sai.
- Sửa kèm: `orderBy` chọn mechanism ACTIVE đổi từ `version desc` sang `approvedAt desc` — "version desc"
  không so được đúng giữa nhiều `ZMechanismDefinition` khác nhau cùng kind COMMISSION (mỗi definition tự
  đếm version từ 1).

## Bằng chứng (QA thật, project cô lập riêng — không đụng fixture project khác)
File mới `v2-commission-draft.itest.ts`, 3/3 PASS trên `zenith_qa`:
1. `salesCode` không tồn tại -> `SALE_NOT_FOUND` (không bịa số cho giao dịch không có thật).
2. Company chưa có cơ chế COMMISSION ACTIVE -> `NO_ACTIVE_COMMISSION_MECHANISM` (không tự chế tỷ lệ).
3. Có sale thật (paidAmount=10.000.000) + cơ chế ACTIVE thật (rateBps=1500=15%) -> `commissionValue` trả
   về đúng **1.500.000** — tính từ dữ liệu đọc trong DB, không phải số truyền vào job.

## Gate
`tsc --noEmit` 0 lỗi; Vitest unit **495/495 PASS**; Vitest integration **30/30 PASS** (12 file, +1 so
với trước — không có test nào khác bị ảnh hưởng bởi đổi `orderBy`).

## Ledger
MC-17: TODO -> **DONE**.
