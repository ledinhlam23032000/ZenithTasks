# MC-18 — AI con mặc định khi tạo company — 2026-08-29

## Phát hiện lại (khác đánh giá ban đầu)
Kiểm tra kỹ hơn cho thấy UI wizard (`v2-create-project-wizard.tsx`) đã mặc định `enableAi=true` +
`aiName="Trợ lý Y tế & Vận hành"` (không rỗng) — nên qua ĐÚNG đường UI, AI con vẫn được tạo mặc định.
Nhưng việc "mặc định" đó chỉ nằm ở UI, KHÔNG được enforce ở server: `createV2ProjectAction` vẫn có
`if (aiName)` — bất kỳ đường tạo project nào khác wizard (script, seed, API sau này, hoặc admin tự tắt
"Kích hoạt AI") đều tạo ra company **hoàn toàn không có AI con**. Cũng phát hiện `v2-create-project-form.tsx`
— một form CŨ, không field AI, không còn được trang nào import (dead code, đã xoá).

## Đã sửa
- `v2-project-actions.ts`: bỏ điều kiện `if (aiName)` — LUÔN tạo `ZAiAgent kind=CHILD status=ACTIVE`
  khi tạo project. `aiName`/`aiPrompt` rỗng thì dùng mặc định hợp lý (`Trợ lý ${name}` + system prompt
  mặc định đã có sẵn). Sửa `hasAiAgent: Boolean(aiName)` (audit meta) thành `true` — trước đây sẽ ghi
  sai `false` dù AI vẫn được tạo với tên mặc định.
- `v2-create-project-wizard.tsx`: bỏ checkbox "Kích hoạt AI" (opt-out) — AI con giờ bắt buộc, admin chỉ
  còn tuỳ chỉnh TÊN/system prompt, không còn cách tắt hẳn qua UI (khớp đúng "mặc định có AI con").
- Xoá `v2-create-project-form.tsx` (dead code, form cũ không field AI, không nơi nào import).

## Bằng chứng (QA thật)
File mới `v2-project-default-ai.itest.ts`, 2/2 PASS:
1. Gọi `createV2ProjectAction` KHÔNG gửi `aiName`/`aiPrompt` (mô phỏng caller ngoài UI) — vẫn tạo ra
   `ZAiAgent kind=CHILD status=ACTIVE`, tên mặc định `Trợ lý <tên project>`.
2. Gọi có gửi `aiName`/`aiPrompt` — dùng đúng giá trị admin nhập, không bị ghi đè bởi mặc định.

## Gate
`tsc` 0 lỗi; unit **495/495**; integration **32/32** (13 file, +1 so với MC-17).

## Ledger
MC-18: TODO -> **DONE**.
