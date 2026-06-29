# Dự án: Ứng dụng nội bộ quản trị — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ, BVĐK Hồng Phúc

> Tài liệu bàn giao để các phiên Claude Code sau tiếp tục hiệu quả. Đọc file này + mã nguồn là nắm được bối cảnh.
> **Kế hoạch nâng cấp dài hạn (A→E) + theo dõi tiến độ: xem `ROADMAP.md` ở gốc repo.**

## Đợt củng cố nền tảng (an toàn & ổn định) — "Đợt 1"
> Mục tiêu: tiền tính đúng & nguyên tử, ảnh y khoa không lộ, có cảnh báo cấu hình kém an toàn. Tự kiểm thử: TSC pass, 40/40 test.
- **A1 — Xác thực ảnh y khoa**: route `/media/[file]` KHÔNG còn công khai. Chỉ phục vụ khi (1) đã đăng nhập (cookie phiên) HOẶC (2) có "vé" ký ngắn hạn `?t=`. Vé = HMAC-SHA256(tên tệp + hạn) ký bằng `AUTH_SECRET`, gắn đúng 1 tệp, hạn 24h — `web/src/lib/media-token.ts` (`signMediaToken`/`verifyMediaToken`/`withMediaToken`). Cổng khách `/khach/[token]` ký vé từng ảnh qua `withMediaToken`. Trang nhân viên không đổi (trình duyệt tự gửi cookie). Đã test dev: không vé→401, vé đúng→200, vé sai/khác tệp→401.
- **A3 — Tiền nguyên tử**: `ho-so/actions.ts` thêm `withCaseLock(caseId, fn)` = `$transaction` + `SELECT … FOR UPDATE` khoá hàng hồ sơ. `recalc(caseId, db)` nhận client giao dịch. Đã bọc add/update/remove dịch vụ, voucher, add/update/delete thanh toán → hai người thao tác cùng lúc không ghi đè số liệu.
- **A4 — Test toán tiền**: tách toán thuần ra `web/src/lib/case-math.ts` (`computeCaseTotals`) + test (`case-math.test.ts` 8, `media-token.test.ts` 7).
- **A2 — Cảnh báo khoá demo**: `web/src/lib/security-status.ts` (`securityWarnings()`) phát hiện `PHONE_ENC_KEY` = khoá demo công khai → banner đỏ cho ADMIN ở `(app)/layout.tsx`. KHÔNG hard-fail (tránh sập app đang chạy bằng khoá demo). 🔑 Chủ cần đổi khoá thật + `npm run rotate:phone`.
- **A6 — CSP**: `next.config.ts` thêm `Content-Security-Policy` (+ object-src none, base-uri, form-action, frame-ancestors).
- ⚠️ **Sandbox/proxy Prisma**: nếu `npm install` lỗi ECONNRESET ở `@prisma/engines` (trình tải bỏ qua proxy), tải engine bằng `curl --proxy http://127.0.0.1:34227 --cacert /root/.ccr/ca-bundle.crt <url schema-engine.gz>` rồi `gunzip` vào `node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x` + `chmod +x`; đặt `CHECKPOINT_DISABLE=1` để tắt telemetry (bị policy chặn 403).

## Đợt chủ động & theo dõi — "Đợt 2"
> Biến app từ "ghi chép" sang "chủ động nhắc việc" + cho quản trị thấy sức khoẻ hệ thống + sao lưu tự động. TSC pass, 40/40 test, smoke test dev server (2 trang mới + hồ sơ đều 200).
- **B1 (lõi) — "Việc cần làm hôm nay"** (`/viec-hom-nay`): `lib/workqueue.ts` `getWorkqueue()` tổng hợp **từ dữ liệu sẵn có, KHÔNG đổi schema, KHÔNG cron**: tái khám đến hạn (≤2 ngày), hẹn hôm nay chưa đến, công nợ quá hạn (>15 ngày), sinh nhật khách hôm nay (raw `EXTRACT`), khách nguội (>60 ngày + không có tái khám sắp tới, raw `make_interval`), kho cảnh báo. Ngưỡng = hằng số đầu file. Module `viec-hom-nay` (icon `ListTodo`) cho hầu hết vai trò vận hành. ⏳ Phần 2 (Web Push + việc có người phụ trách/đánh dấu xong) cần model + cron + VAPID.
- **A7 — Tình trạng hệ thống** (`/he-thong`, ADMIN): `lib/system-status.ts` gom cảnh báo bảo mật + quy mô dữ liệu + kích thước DB (`pg_database_size`) + dung lượng ảnh (quét `public/uploads`) + lần sao lưu gần nhất + 10 audit gần nhất. Icon `ServerCog`.
- **A5 — Sao lưu tự động**: `scripts/backup.mjs` (`pg_dump -Fc` + ảnh `tar.gz` + giữ 14 bản + ghi `backup-status.json`); `npm run backup`; `docker-entrypoint.sh` chạy nền 1 lần lúc khởi động rồi mỗi 24h. Sao lưu OFFSITE vẫn là `windows/Sao-Luu.ps1`.
- Lưu ý kỹ thuật: trong sandbox Postgres có thể tự dừng (stale pid) → `pg_ctlcluster 16 main start`. DB sandbox cần `npm run db:seed` để có dữ liệu thử (admin/123456).

## Đợt chất lượng mã nguồn — trọn Nhóm E — "Đợt 19"
> TSC pass, **144/144 test** (+5 test `pnl`). Lint giảm 17→15 (0 cảnh báo biến không dùng).
- **E1** — số liệu THỰC: `PROJECT-OVERVIEW.md` sửa "~15k LOC, 19 model, 22 migration" → con số
  đã kiểm chứng **~21k LOC, 25 model, 25 migration**.
- **E2** — tách tầng domain tiền: thêm `lib/pnl.ts` (`computePnl` THUẦN, có test) — tách toán
  Lãi/Lỗ ra khỏi `getMonthlyPnl` trong `reports.ts` (giờ chỉ truy vấn DB rồi gọi `computePnl`).
  Cùng với `case-math.ts` + `inventory-cost.ts` đã có → logic tiền chính đều ở lib thuần có test.
- **E3** — lint: xác nhận **0 cảnh báo biến không dùng** (đã dọn từ Đợt 13). Sửa `two-factor.tsx`
  bỏ 2 `setState-in-effect` (suy trạng thái bật/tắt ngay khi render — giữ nguyên hành vi). Còn 15
  lỗi `react-hooks` (React Compiler) KHÔNG chặn build: phần lớn false-positive trên Server Component
  (`Date.now()` khi render RSC) + truy cập `window` an toàn-SSR; số còn lại (command-palette,
  permission-editor) cần refactor effect tương tác → để đợt riêng tránh rủi ro.
- **Gom label/enum**: rà soát — nhãn trạng thái đã tập trung ở `lib/status.ts`; nhãn theo miền
  (`leads.ts`, `nps.ts`, `finance.ts`) đặt cùng module domain là HỢP LÝ, không có trùng lặp cần gom.

## Đợt cổng khách: đánh giá NPS + link có hạn (D3 hoàn tất) — "Đợt 18"
> TSC pass, **139/139 test** (+6 test `nps`). E2E THẬT (Playwright, cổng khách CÔNG KHAI):
> mở `/khach/<token>` → mục "Đánh giá trải nghiệm" → chọn điểm 9 + góp ý → gửi → lời cảm ơn;
> kiểm DB có NpsResponse(score=9). Đặt token hết hạn → trang hiện "Liên kết đã hết hạn".
- **NPS (đánh giá trải nghiệm)**: model `NpsResponse` (score 0–10 + comment). `lib/nps.ts`
  THUẦN (có test): `npsCategory` (0–6 chưa hài lòng / 7–8 bình thường / 9–10 hài lòng),
  `npsSummary` (NPS = %hài lòng − %chưa hài lòng, điểm TB, đếm nhóm). Khách tự đánh giá ở
  cổng khách (action công khai `portalSubmitNps`, rate-limit, chỉ hiện khi đã có lịch sử điều
  trị & chưa đánh giá trong 30 ngày). Thẻ "NPS" trên `/phan-tich` (điểm + TB + 3 nhóm).
- **Link cổng khách có HẠN + thu hồi (D3)**: thêm `Customer.portalTokenExpiresAt`. `genPortalLink`
  đặt hạn 90 ngày; cổng khách kiểm hạn → hết hạn hiện thông báo thân thiện (không lộ dữ liệu).
  Thu hồi (`revokePortalLink`) xoá cả token lẫn hạn. (Action công khai `customerByToken` cũng
  từ chối token hết hạn.)

## Đợt trợ lý AI hỏi-đáp số liệu (D1) — "Đợt 17"
> TSC pass, **133/133 test** (+6 test `assistant`). E2E THẬT (Playwright + mock AI OpenAI-compat
> + DB seed): mở `/tro-ly` → gõ câu hỏi → đường getAssistantContext (truy vấn thật) →
> formatAssistantContext → ai.ts gọi chuẩn OpenAI → câu trả lời hiện trên UI. (Cũng là lần đầu
> chạy thực đường OpenAI-compatible của lớp AI Đợt 14.)
- **An toàn theo thiết kế**: AI KHÔNG truy cập thẳng DB. Máy chủ tính sẵn "ảnh chụp" số liệu
  KINH DOANH (doanh thu/công nợ/dịch vụ bán chạy/RFM/churn/tồn kho/leads/ROI) — KHÔNG gồm SĐT
  / dữ liệu y khoa — rồi đưa cho AI trả lời CHỈ dựa trên đó (chống bịa số + rò rỉ).
- **`lib/assistant.ts`** (THUẦN, có test): `formatAssistantContext` (số liệu → văn bản gọn),
  `ASSISTANT_SYSTEM` (lời nhắc), `SUGGESTED_QUESTIONS`.
- **`lib/assistant-data.ts`**: `getAssistantContext()` tái dùng `getBusinessAnalytics(30)` +
  truy vấn doanh thu 30 ngày / khách-hồ sơ mới / lịch hẹn hôm nay / công nợ + top nợ / dịch vụ
  bán chạy / tồn kho thấp / leads.
- **Trang `/tro-ly`** (module mới `tro-ly`, icon `Sparkles`, quyền ADMIN/MANAGER/SHAREHOLDER):
  ô hỏi + câu hỏi gợi ý + lịch sử hỏi-đáp trong phiên. Action `askAssistant` (audit `ASK_ASSISTANT`).
  Chưa cấu hình AI → hiện hướng dẫn bật. 🔑 Cần `AI_API_KEY` (nhà cung cấp bất kỳ — anh đã cắm DeepSeek).
- **Sửa kèm**: `prisma/rotate-phone-key.ts` nay mã hoá lại CẢ `Lead` (Đợt 16 thêm SĐT cho lead) —
  trước chỉ xử lý `Customer`, đổi khoá sẽ làm hỏng SĐT lead.

## Sửa lẻ — nút Liên hệ hiện SỐ + chép số (UX trên máy tính)
> Nút Gọi/SMS là deep-link `tel:`/`sms:` chỉ chạy trên điện thoại; trên MÁY TÍNH bấm
> không có gì. Sau khi "Liên hệ", `ContactButtons` giờ HIỆN SỐ ĐẦY ĐỦ (font mono) + nút
> "Chép số" (clipboard) → nhân viên đọc/sao chép rồi gọi bằng ĐT chăm sóc riêng của PK.
> Nút Gọi/SMS/Zalo vẫn còn cho ai dùng điện thoại. TSC pass.

## Đợt khách tham khảo / leads — "Đợt 16"
> TSC pass, **127/127 test** (+4 test `leads`). Smoke test THẬT (Playwright + DB): mở
> /khach-tham-khao → thêm khách tham khảo (có SĐT) → hiện trong danh sách → "Chuyển khách"
> (modal xác nhận) → điều hướng vào hồ sơ khách → kiểm tra DB: Lead=CONVERTED + Customer
> mới tạo (SĐT mã hoá copy sang, nguồn REFERRAL) → dọn dữ liệu test.
- **Tính năng**: "khách tham khảo" — khách từ nhiều nguồn giới thiệu tới THAM KHẢO dịch vụ
  nhưng CHƯA hẹn, CHƯA đến (theo yêu cầu). Phễu trước khi thành khách/đặt lịch.
- **Model `Lead`** + enum `LeadStatus` (migration `20260627160000_lead`): tên + SĐT mã hoá
  (tuỳ chọn, như Customer) + nguồn/chi tiết nguồn + dịch vụ quan tâm + trạng thái (Mới / Đã
  liên hệ / Đã chuyển khách / Không quan tâm).
- **`lib/leads.ts`** (THUẦN, có test): nhãn/sắc thái trạng thái + `summarizeLeads` (phễu:
  tổng / đang theo đuổi / đã chuyển / tỉ lệ chuyển đổi %).
- **Trang `/khach-tham-khao`** (module mới `khach-tham-khao`, icon `UserSearch`, quyền ADMIN/
  MANAGER/TELESALE/RECEPTION): 4 thẻ thống kê phễu + lọc theo trạng thái + bảng + thêm/sửa/xoá +
  đổi nhanh trạng thái + nút **"Chuyển khách"**.
- **Chuyển đổi** `convertLeadToCustomer`: COPY thẳng SĐT đã mã hoá sang Customer (KHÔNG giải mã),
  chống trùng theo phoneHash, đánh dấu Lead = CONVERTED, mở hồ sơ khách. Audit đầy đủ.

## Đợt hẹn nợ / trả góp công nợ (B3 bổ sung) — "Đợt 15"
> TSC pass, **123/123 test** (+12 test `debt-plan`). Smoke test THẬT (Playwright + DB):
> lập hẹn nợ trên hồ sơ HS00002 → hiện "Ngày 15 hằng tháng" + 3.000.000/tháng → /cong-no
> hiện gợi ý kỳ tới → kiểm tra hàng DebtPlan trong DB (day=15, 3.000.000) → dọn dữ liệu test.
- **Tính năng**: khách công nợ "hẹn nợ" — mỗi tháng vào **ngày X** trả **Y đồng** tới khi hết
  nợ (theo yêu cầu: "ngày bao nhiêu hàng tháng sẽ trả, mỗi tháng trả bao nhiêu").
- **Model `DebtPlan`** (migration `20260627150000_debt_plan`): 1 hồ sơ 1 kế hoạch (caseId unique),
  `dayOfMonth` 1..28, `monthlyAmount`, `startDate`, `note`. KHÔNG sinh từng dòng kỳ — suy ra lịch.
- **`lib/debt-plan.ts`** (THUẦN, có test): `nextDueDate`, `monthsToClear`, `duePeriods`,
  `expectedPaidByNow`, `debtPlanStatus` (kỳ tới + dự kiến hết nợ + đang chậm so với cam kết).
- **Giao diện**: thẻ Tài chính của hồ sơ có khối "Hẹn nợ (trả góp)" — `DebtPlanCard` (modal lập/sửa
  + hủy). `/cong-no` mỗi hàng có nợ + có kế hoạch hiện "Hẹn {tiền}/th · kỳ {ngày}". Quyền `payment.add`.
- **Actions** `cong-no/actions.ts`: `saveDebtPlan` (upsert, cặp `useFormAction` — không revalidate),
  `deleteDebtPlan` (ConfirmButton — revalidate). Audit `SAVE_DEBT_PLAN`/`DELETE_DEBT_PLAN`.

## Đợt AI trung lập nhà cung cấp (chọn model giá rẻ tuỳ ý) — "Đợt 14"
> TSC pass, **111/111 test** (+9 test `resolveAiConfig`). Theo yêu cầu: "cân nhắc AI giá rẻ
> của Trung Quốc như DeepSeek… không thiên vị AI nào".
- **Lớp AI tách khỏi 1 hãng** (`lib/ai.ts`): viết lại để TRUNG LẬP NHÀ CUNG CẤP. Hàm thuần
  `resolveAiConfig(env)` (có test) phân giải `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`/`AI_PROVIDER`;
  `generateMessage` gọi đúng 1 trong 2 chuẩn API: **OpenAI-compatible** (`/chat/completions` —
  DeepSeek, Qwen, Gemini-compat, OpenAI, Groq, tự host Ollama/vLLM) hoặc **Anthropic**
  (`/v1/messages` — Claude). Tự suy nhà cung cấp từ base URL nếu không khai báo. Vẫn tương
  thích ngược `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (cách cũ chạy y nguyên).
- **Cấu hình + vận hành**: `.env.example` thêm khối "AI" với base/model mẫu cho 5 hãng + lưu ý
  CHỦ QUYỀN DỮ LIỆU (DeepSeek/Qwen xử lý ở TQ; muốn dữ liệu không ra ngoài → tự host, trỏ
  `AI_BASE_URL` về máy nội bộ). `docker-compose.yml` (gốc + `deploy/`) truyền `AI_*`.
  `windows/Cai-AI-Key.ps1` đổi thành TRÌNH CHỌN nhà cung cấp (1=DeepSeek 2=Qwen 3=Gemini
  4=OpenAI 5=Claude 6=tự host) — tự điền base/model, chỉ hỏi key.
- **Khuyến nghị (khách quan, tự kiểm chứng giá trước khi chốt)**: tin nhắn chăm sóc rất ngắn
  nên model rẻ nào cũng đáp ứng. Rẻ nhất ≈ DeepSeek/Qwen (~vài nghìn đồng/triệu token); cân
  bằng tiếng Việt + giá ≈ Gemini 2.0 Flash; muốn dữ liệu y tế KHÔNG rời máy phòng khám → tự
  host (mục 6). App vốn chỉ gửi tên khách + tên dịch vụ, KHÔNG gửi SĐT.

## Đợt ROI marketing + dọn lint (C3 + E3) — "Đợt 13"
> TSC pass, **102/102 test** (+2 test `marketingRoi`). Smoke test THẬT (Playwright): `/phan-tich`
> hiện section "ROI Marketing".
- **C3**: `lib/analytics.ts` `marketingRoi(revenue, spend)` (có test). `analytics-data.ts` thêm chi
  phí marketing (Sổ thu chi EXPENSE/MARKETING trong kỳ) + doanh thu thực thu từ khách nguồn marketing.
  Trang `/phan-tich` thêm card "ROI Marketing" (chi phí / doanh thu / ROI). ⚠️ ROI chỉ chính xác khi
  chủ ghi chi phí marketing ở Sổ thu chi (mục "Marketing & quảng cáo").
- **E3**: xóa 5 cảnh báo lint (biến `m`/`PageHeader`/`BarChart` không dùng + sửa vị trí
  `eslint-disable` ở avatar). Còn 15 lỗi `react-hooks/set-state-in-effect` (rule mới áp code cũ —
  sửa cần refactor effect, để đợt riêng; không chặn build).

## Đợt cổng khách tự xác nhận / đổi lịch (D3 gđ1) — "Đợt 12"
> Trên cổng khách công khai (`/khach/[token]`) thêm "Lịch hẹn sắp tới": khách tự xác nhận sẽ đến /
> đề nghị đổi lịch. TSC pass, **100/100 test**. Smoke test THẬT (Playwright, KHÔNG đăng nhập): xác
> nhận → lịch hẹn CONFIRMED; đề nghị đổi → tạo CareMessage (NOTE/IN) + ghi note lịch hẹn.
- **`khach/[token]/actions.ts`** (server action CÔNG KHAI): `portalConfirmAppointment` +
  `portalRequestReschedule`. Mọi thao tác kiểm token → khách → lịch hẹn thuộc đúng khách. Chống
  spam bằng `rate-limit.bump` (theo token). KHÔNG tự đổi giờ — chỉ ghi nhận yêu cầu cho nhân viên.
- **`khach/[token]/appointment-actions.tsx`** (client): nút xác nhận / đề nghị đổi (ô nhập khung giờ).
- ⚠️ Đây là action PUBLIC → bảo mật dựa hoàn toàn vào việc kiểm quyền sở hữu theo token + rate-limit.
- ⏳ Còn (D3): đánh giá NPS; token cổng khách có hạn dùng / tự thu hồi.

## Đợt phiếu đồng ý / consent (B6 hoàn tất) — "Đợt 11"
> Soạn mẫu phiếu → ghi nhận trên hồ sơ (tự điền tên/ngày/dịch vụ) → in cho khách ký tay. TSC pass,
> **100/100 test** (+5 test `consent`). Smoke test THẬT (Playwright + Chromium): /mau-phieu hiện
> mẫu; ghi nhận đồng ý → prefill thay {{ten}} đúng → lưu → phiếu hiện + DB có snapshot; trang in
> render đủ tiêu đề/nội dung/ô ký.
- **Schema** (migration `20260627140000_consent`): `ConsentTemplate` (mẫu) + `CaseConsent` (phiếu đã
  ký — lưu SNAPSHOT title/body + signerName/relationship/signedAt).
- **`lib/consent.ts`** (toán THUẦN, có test): `fillConsentTemplate` thay placeholder
  `{{ten}}/{{ngay}}/{{dichvu}}/{{mahoso}}`.
- **`/mau-phieu`** (module mới ADMIN/MANAGER): CRUD mẫu phiếu (`mau-phieu/actions.ts` + `template-forms.tsx`).
- **Hồ sơ** (`ho-so/[id]`): card "Phiếu đồng ý" + `AddConsentButton` (chọn mẫu → tự điền, sửa được)
  + nút In + xóa. Action ở `ho-so/consent-actions.ts`. Trang in `ho-so/[id]/consent/[consentId]`
  (dùng `.invoice-sheet`, 2 ô ký).
- ⚠️ "Ký số" thực thụ chưa làm — in giấy cho khách ký tay (đúng thực tế); placeholder hỗ trợ ở
  `consent-widgets.tsx` (controlled title/body để chọn mẫu là tự điền).
- ⚠️ Lưu ý dev: route lồng mới `[id]/consent/[consentId]` lần đầu bị Turbopack biên dịch theo yêu
  cầu → request đầu có thể 404 trong dev; `next build` (production) biên dịch sẵn nên không sao.

## Đợt phiếu nhập kho nhiều dòng (B5 hoàn tất) — "Đợt 10"
> Nhập nhiều vật tư trong MỘT phiếu, gửi trong 1 giao dịch. TSC pass, **95/95 test** (+5 test
> `stock-in`). Smoke test THẬT (Playwright + Chromium): nhập 2 dòng → tồn + giá vốn bình quân +
> StockMovement IN đều đúng (Botox 54→64 @515.625; Chỉ Collagen 0→20 @300.000).
- **`lib/stock-in.ts`** (toán THUẦN, có test): `validStockInLines`/`parseStockInLines`/`stockInTotal`.
- **`kho/actions.ts`** `stockInBatch`: mỗi dòng cộng tồn + cập nhật `avgCost` bình quân + ghi
  `StockMovement` IN, trong 1 `$transaction`. Quyền ADMIN/MANAGER. Ghi chú/NCC dùng chung cả phiếu.
- **`kho/stock-in-batch.tsx`**: modal nhiều dòng (thêm/xóa động) + nút "Nhập kho" trên `/kho`
  (ADMIN/MANAGER). Dùng `onSubmit`+`preventDefault` (tránh React 19 reset mất dòng đã nhập — xem B4).
- Lưu ý: nút nhập kho 1-dòng cũ ở Danh mục vẫn giữ; phiếu nhiều dòng ở trang Kho là cách nhanh hơn.

## Đợt chống trùng lịch hẹn (B4 giai đoạn 1) — "Đợt 9"
> Cảnh báo khi đặt/sửa lịch mà người phụ trách (tư vấn) đã có hẹn khác đụng giờ (cửa sổ 30 phút),
> cho ghi đè "Vẫn đặt lịch này". TSC pass, **90/90 test** (+7 test `schedule`). Smoke test THẬT
> (Playwright + Chromium): đặt lịch A 10:00 (người phụ trách X) → đặt B 10:15 cùng X → cảnh báo
> trùng + nút ghi đè → bấm ghi đè tạo được B (DB có cả 2).
- **`lib/schedule.ts`** (toán THUẦN, có test): `slotConflict`, `findConflicts` (bỏ chính lịch đang
  sửa), `minutesApart`, hằng `SLOT_WINDOW_MIN=30`.
- **Action** (`lich-hen/actions.ts`): `consultantConflictMessage` truy vấn lịch khác cùng người phụ
  trách (trạng thái còn hiệu lực) trong ngày → câu cảnh báo. Tách lõi `doCreate/doUpdateAppointment
  (formData, force)` + 2 export: thường (kiểm tra trùng) và **forced** (bỏ qua) cho nút ghi đè.
- **Form** (`new-appointment.tsx`): cảnh báo vàng + nút "Vẫn đặt lịch này" gọi action forced.
- ⚠️ **Cạm bẫy React 19:** `<form action={fn}>` tự reset input không kiểm soát sau mỗi lần gửi →
  mất dữ liệu sau cảnh báo trùng (+ nút ghi đè gửi form rỗng). Khắc phục: chuyển sang `onSubmit` +
  `e.preventDefault()` + gọi action thủ công (không dùng prop `action`). Lý do KHÔNG truyền cờ
  force qua `fd.set()`: Next/React lược bỏ field tự thêm khi gọi server action → phải dùng 2 action
  server riêng (thường / forced).
- ⏳ Còn (B4): tài nguyên phòng/giường; link khách tự xác nhận (gắn D3 cổng khách).

## Đợt an toàn y khoa (B6 giai đoạn 1) — "Đợt 8"
> Thêm thông tin AN TOÀN Y KHOA cho khách (dị ứng / tiền sử / chống chỉ định) + cảnh báo nổi bật để
> bác sĩ thấy TRƯỚC khi làm dịch vụ — rất quan trọng với phòng khám phẫu thuật thẩm mỹ. Không cần
> API/tài khoản. TSC pass, **83/83 test** (schema + UI, không thêm test). Smoke test THẬT (Playwright
> + Chromium): set 3 trường cho 1 khách → banner đỏ "Lưu ý an toàn y khoa" hiện đúng trên cả trang
> khách hàng lẫn trang hồ sơ điều trị.
- **Schema** (migration `20260627130000_customer_medical`, viết tay): thêm 3 cột text nullable vào
  `Customer`: `allergies`, `medicalHistory`, `contraindications`.
- **Nhập liệu**: mở rộng `updateCustomer` (action) + `EditCustomerButton` (form khách hàng) thêm
  mục "An toàn y khoa" 3 ô. Người sửa: ADMIN/MANAGER/RECEPTION/TELESALE (lễ tân ghi khi tiếp nhận).
- **Cảnh báo**: `components/ui/medical-alert.tsx` (mới) — banner đỏ; dị ứng + chống chỉ định tô đỏ
  đậm, tiền sử để nhạt; **ẩn hoàn toàn** nếu trống. Gắn vào `/khach-hang/[id]` (dưới thẻ hồ sơ) +
  `/ho-so/[id]` (bản gọn, nơi bác sĩ thao tác).
- ⏳ Còn (B6): phiếu đồng ý (consent) ký số; mẫu hồ sơ y khoa theo loại dịch vụ; cho bác sĩ
  (DOCTOR/CONSULTANT) tự sửa thông tin y khoa (hiện chỉ ADMIN/MANAGER/RECEPTION/TELESALE sửa được).

## Đợt phân tích kinh doanh (BI — Nhóm C) — "Đợt 7"
> Trang mới `/phan-tich` — chỉ ĐỌC dữ liệu sẵn có, KHÔNG đổi schema, KHÔNG cần API/tài khoản.
> Làm phần lõi C1 (RFM + radar khách rời bỏ), C2 (LTV theo nguồn), C4 (phễu chuyển đổi). TSC pass,
> **83/83 test** (+13 test `analytics`). Smoke test THẬT bằng trình duyệt (Playwright + Chromium):
> ADMIN thấy đủ 4 phần + đổi khoảng thời gian 30 ngày OK; TELESALE (không quyền `mod:phan-tich`) bị
> chặn → `/khong-co-quyen` (xác nhận bằng nội dung trang, vì redirect chạy phía client).
- **`lib/analytics.ts`** (toán THUẦN, có test): `rfmScore` (chấm Recency/Frequency/Monetary theo
  ngưỡng `DEFAULT_RFM` tinh chỉnh được), `rfmSegment` (6 phân khúc: VIP/Trung thành/Mới/Nguy cơ rời
  bỏ/Đang ngủ/Khác), `isChurnRisk`, `funnelRates` (tỉ lệ từng bậc so bậc đầu & bậc trước).
- **`lib/analytics-data.ts`** (truy vấn + lắp ráp): `getBusinessAnalytics(days)` — RFM toàn bộ khách
  (raw SQL gom số lần + tổng chi + lần cuối), đếm phân khúc, lọc khách "nguy cơ rời bỏ" (ưu tiên
  giá trị cao); phễu hồ sơ (mở→tư vấn→chốt→thu) + phễu lịch hẹn (hẹn→đến) trong kỳ; LTV theo nguồn.
- **Trang `/phan-tich`** (module mới — ADMIN/MANAGER/SHAREHOLDER; icon `PieChart`): 4 thẻ tổng quan
  + chọn khoảng thời gian (query string), phễu (thanh ngang), phân bố phân khúc RFM, **radar khách
  rời bỏ** (bảng kèm `ContactButtons` mẫu "mời quay lại" — tái dùng B2 bậc 1), LTV theo nguồn.
- Thêm icon `PieChart` vào `app-shell.tsx` (bản đồ ICONS của thanh điều hướng).
- ⏳ Còn nhóm C: C3 ROI theo nguồn (cần gắn chi phí marketing — nguồn từ Sổ thu chi), dự báo doanh
  thu, cohort theo tháng, tự đẩy danh sách khách rời bỏ vào "Việc cần làm hôm nay" (B1).

## Đợt định mức vật tư theo dịch vụ (BOM) — "Đợt 6"
> Nối tiếp Đợt 4 (giá vốn kho). Khai báo "1 lần làm dịch vụ X tiêu hao mặc định bao nhiêu vật
> tư" (BOM), rồi thêm nút trên hồ sơ để TỰ ghi nhận vật tư + trừ kho theo định mức — chống quên
> ghi vật tư. TSC pass, **70/70 test** (+8 test `service-bom`). Smoke test THẬT bằng trình duyệt
> (Playwright + Chromium): khai báo Botox 2 lọ/lần cho dịch vụ filler → thêm dịch vụ (SL 2) vào
> hồ sơ → bấm "Trừ VT" → kiểm DB: tồn Botox 54→50 (đúng 2×2=4), MaterialUsage 4 lọ, StockMovement
> OUT 4 @ giá vốn 500.000, `bomApplied=true`, nút đổi thành nhãn "Đã trừ VT".
- **Schema** (migration `20260627120000_service_bom`, viết tay): model **`ServiceMaterial`**
  (`serviceId`+`materialId`+`quantity` định mức/lần, unique theo cặp; quan hệ `Service.materials`
  + `Material.serviceMaterials`) + cờ **`CaseService.bomApplied`** (Boolean, chống trừ kho 2 lần).
- **`lib/service-bom.ts`** (toán THUẦN, có test): `scaleBomQty` (định mức × SL dịch vụ phần
  nguyên), `bomNeeds` (quy đổi cả danh sách, đánh dấu `short` khi thiếu tồn, bỏ dòng định mức 0),
  `bomShortages`, `bomCost` (giá vốn ước tính = Σ need × giá vốn bình quân).
- **Danh mục** (`danh-muc`): server action `addServiceMaterial` (upsert) + `removeServiceMaterial`;
  `ServiceBomButton` (modal ở `catalog-forms.tsx`) — mỗi dịch vụ có nút "Định mức vật tư" (huy hiệu
  số dòng) để liệt kê/thêm/xóa định mức (Combobox chọn vật tư + số định mức/lần). Chỉ ADMIN/MANAGER.
- **Hồ sơ** (`ho-so/[id]`): server action `applyServiceBom` — nạp định mức của dịch vụ → tạo
  MaterialUsage (× SL dịch vụ) + trừ kho + StockMovement OUT (đơn giá = giá vốn bình quân → COGS)
  trong **1 giao dịch**, rồi set `bomApplied=true`. Dòng dịch vụ (gắn danh mục + có định mức + chưa
  áp) hiện nút "Trừ VT" (ConfirmButton); đã áp → nhãn "Đã trừ VT". Vật tư khác vẫn ghi tay như cũ.
- ⏳ Còn (B5): phiếu nhập kho nhiều dòng (1 phiếu nhập nhiều vật tư cùng lúc).
- ⚠️ **Cố ý** không tự áp định mức ngay khi thêm dịch vụ (mà để nhân viên bấm nút): vì thêm dịch
  vụ có thể chỉ để báo giá/tư vấn — chưa thực làm → chưa nên trừ kho. Nhân viên chủ động bấm khi
  ca thực sự được làm.

## Đợt công nợ chủ động + liên hệ nhanh — "Đợt 5"
> Làm đồng thời 2 hạng mục theo yêu cầu chủ: B3 (sổ công nợ chủ động) + B2 bậc 1 (nút liên hệ
> Gọi/SMS/Zalo deep-link, không cần tài khoản SMS/Zalo OA). TSC pass, **62/62 test** (+13 test
> mới: `debt-aging` 8, `message-templates` 5). Smoke test thật bằng trình duyệt (Playwright +
> Chromium pre-installed): `/cong-no` hiện 13 hồ sơ nợ, lọc tab "30–60 ngày" → còn 5 (đúng); bấm
> "Liên hệ" trên 1 dòng → gọi `revealPhone` (đã có sẵn, gate quyền `phone.full`) → hiện đủ 3 nút
> Gọi (`tel:`) / SMS (`sms:...?body=` kèm tin nhắn nhắc nợ tiếng Việt đã URL-encode đúng) / Zalo
> (`zalo.me/<số>`); vai trò DOCTOR (không có quyền `mod:cong-no`) vào `/cong-no` bị chuyển hướng
> `/khong-co-quyen` — RBAC đúng.
- **`lib/debt-aging.ts`** (toán THUẦN, có test): `debtAgeDays`, `debtAgingBucket` (4 mốc 0-15/
  15-30/30-60/60+ ngày), `isOverThreshold` (cảnh báo vượt ngưỡng).
- **`lib/message-templates.ts`** (toán THUẦN, có test): sinh sẵn nội dung tin nhắn theo ngữ cảnh
  (nhắc nợ, nhắc tái khám, xác nhận hẹn, sinh nhật, khách nguội) — chỉ tạo TEXT, không tự gửi.
- **`components/ui/contact-buttons.tsx`** (mới): tái dùng `revealPhone` (server action có sẵn ở
  `khach-hang/actions.ts`, đã gate quyền + ghi nhật ký `REVEAL_PHONE`) → sau khi hiện số đầy đủ,
  render nút Gọi/SMS (kèm sẵn tin nhắn mẫu nếu truyền vào)/Zalo. Cũng thêm nút SMS vào
  `khach-hang/[id]/admin-phone.tsx` (trước đã có Gọi + Zalo) cho đồng bộ.
- **Trang Sổ công nợ** (`/cong-no`, module mới — ADMIN/MANAGER/RECEPTION/CONSULTANT/SHAREHOLDER):
  liệt kê hồ sơ còn nợ (`CaseRecord.debtAmount > 0`), tab lọc theo tuổi nợ (query string, không
  cần JS), ô nhập ngưỡng cảnh báo (mặc định 5tr) → hồ sơ vượt ngưỡng tô đỏ. Thẻ tổng công nợ/số hồ
  sơ vượt ngưỡng/nợ lâu nhất. Mỗi dòng có `ContactButtons` kèm sẵn mẫu nhắc nợ (tên + mã hồ sơ +
  số tiền).
- ⏳ Còn: "kế hoạch trả góp" (cần model DB mới — số kỳ + ngày hẹn từng kỳ); tạm dùng `note` có sẵn
  ở hồ sơ để nhân viên ghi tay khi thoả thuận trả góp. Kênh Email (bậc 1) chưa làm vì `Customer`
  hiện chưa có field email — để chủ quyết có cần thêm không trước khi đổi schema. Bậc 2–3 (tự
  động gửi SMS/Zalo OA thật) 🔑 cần chủ cấp tài khoản SMS Brandname/Zalo OA.

## Đợt kho theo chuẩn y tế (giá vốn) — "Đợt 4"
> Bắt nguồn từ lỗi kho không trừ tồn (mục ngay dưới), sau đó nâng kho lên "có giá vốn" để tính giá trị tồn kho & giá vốn vật tư đã dùng (COGS). TSC pass, **49/49 test** (+9 test giá vốn), smoke test thật bằng trình duyệt (Playwright + Chromium pre-installed).
- **Schema** (migration `20260626140000_inventory_costing`, viết tay): `Material.avgCost` (giá vốn bình quân gia quyền) + `StockMovement.unitCost` (đơn giá theo từng giao dịch kho).
- **`lib/inventory-cost.ts`** (toán THUẦN, có test `inventory-cost.test.ts`): `weightedAvgCost` (bình quân gia quyền; nếu CHƯA từng ghi giá vốn → LẤY luôn giá nhập, không pha loãng với tồn "giá 0"; nhập không khai báo giá → giữ nguyên giá cũ), `stockValue`, `totalStockValue`.
- **Nhập kho** (`danh-muc/actions.ts` `stockIn` + form ở `danh-muc/page.tsx`): thêm ô "Giá vốn" → cập nhật `avgCost` bình quân + lưu `unitCost` vào dòng IN. Gói trong `$transaction`.
- **Xuất/hoàn kho cho hồ sơ** (`ho-so/actions.ts`): `addMaterial`/`removeMaterial`/`updateMaterialUsage` ghi `unitCost` = giá vốn bình quân tại thời điểm đó (truy vết COGS).
- **Trang Kho** (`/kho`): thẻ "Giá trị tồn kho" (Σ tồn×giá vốn) + "Giá vốn đã xuất 30 ngày" (COGS); cột "Giá vốn tồn" trong bảng. Cảnh báo FEFO/hạn dùng đã có sẵn từ trước.
- **Smoke test thật**: nhập 10 @ 500.000 cho Botox (tồn 47→57, giá vốn 0→500.000, giá trị tồn 28.500.000, dòng IN unitCost=500.000); thêm 3 vào hồ sơ → OUT ghi unitCost=500.000, tồn 57→54.
- ⚠️ **Cố ý KHÔNG** cộng COGS vật tư vào Lãi/Lỗ (Báo cáo) để tránh **tính trùng** với chi phí mua vật tư chủ có thể đã ghi tay ở Sổ thu chi. Giá vốn ở đây là thông tin tham khảo trên trang Kho. Nếu sau này muốn đưa vào P&L thì phải thống nhất 1 nguồn (kho HOẶC sổ thu chi), không cả hai.

## Sửa lỗi — Kho không trừ tồn khi thêm vật tư vào hồ sơ
> Phát hiện khi chủ test thực tế: thêm vật tư cho khách nhưng tồn kho không giảm.
- **Nguyên nhân**: form "Thêm vật tư" (`ho-so/[id]/case-widgets.tsx`) chọn vật tư qua `Combobox` chỉ điền sẵn TÊN/ĐƠN VỊ, **không gửi `materialId`** (thiếu input ẩn) → server action `addMaterial` luôn nhận `materialId` rỗng → nhánh trừ kho `if (d.materialId)` không bao giờ chạy.
- **Sửa**: thêm state + input ẩn `materialId` vào form (kèm dòng nhắc "Sẽ tự trừ tồn kho khi lưu" / "Nhập tay không trừ tồn"). Đồng thời gói 3 thao tác (ghi usage + trừ/hoàn tồn + nhật ký `StockMovement`) vào **một `$transaction`** ở `addMaterial`/`removeMaterial`/`updateMaterialUsage` → không còn cảnh "đã ghi vật tư nhưng kho chưa trừ"; bỏ `.catch(()=>{})` nuốt lỗi; nếu vật tư đã bị xóa thì lưu như nhập tay (không lỗi FK).
- **Kiểm thử thật (Playwright + Chromium pre-installed)**: mở hồ sơ → chọn Botox từ danh mục → SL 3 → lưu; DB: tồn 50 → **47**, có `StockMovement OUT 3 "Dùng cho hồ sơ"`, `MaterialUsage.materialId` đã có giá trị. TSC pass, 40/40 test.
- **Lưu ý cho chủ**: bản ghi vật tư ĐÃ thêm SAI trước đây (materialId rỗng) sẽ không tự trừ lùi. Cách sửa: vào hồ sơ **xóa** dòng vật tư cũ rồi **thêm lại** bằng cách chọn từ danh mục (lúc này sẽ trừ kho đúng).

## Đợt trải nghiệm & sáng tạo — "Đợt 3"
> Mục tiêu: 3 tính năng "wow factor" trong `ROADMAP.md` nhóm D, tái dùng tối đa hạ tầng sẵn có (không đổi schema trừ 1 dòng quyền). TSC pass, 40/40 test, smoke test dev server thật (forge JWT `zsession` ký bằng `AUTH_SECRET` tự sinh trong `.env` sandbox — xem `web/BAN-GIAO.md` mục 10 — rồi `curl` các trang có quyền: `/dau-ca`, `/khach-hang`, `/khach-hang/[id]` đều 200, đúng nội dung tiếng Việt).
- **D2 — So sánh ảnh trước/sau**: `lib/components/ui/photo-compare.tsx` — nút "So sánh trước/sau" (ẩn nếu hồ sơ có <2 ảnh) mở modal kéo-so-sánh (con trỏ chuột/chạm, `clip-path`, không thư viện ngoài). Gắn ở trang hồ sơ điều trị (`ho-so/[id]`) và hồ sơ khách hàng (`khach-hang/[id]`).
- **D4 — Tìm kiếm toàn cục (Ctrl/Cmd+K)**: `lib/search-actions.ts` (`globalSearch`, server action) tìm khách hàng/hồ sơ/vật tư, lọc theo quyền hiện có (`moduleCan`). `components/layout/command-palette.tsx` (component có điều khiển `open`/`onOpenChange`) + nút "Tìm kiếm…" trên header `app-shell.tsx` + phím tắt toàn trang.
- **D5 — Màn "đầu ca lễ tân"** (`/dau-ca`, module mới ADMIN/MANAGER/RECEPTION/TELESALE): gộp "khách chưa đến hôm nay" + "khách đang chờ" (tính phút chờ từ `Appointment.arrivedAt` đã có sẵn, tô đỏ nếu ≥20 phút) + rút gọn `getWorkqueue()` (B1) cho các việc tồn đọng khác. Nút 1-bấm tái dùng nguyên `updateAppointmentStatus` đã có ở `lich-hen/actions.ts` (chỉ thêm `revalidatePath("/dau-ca")`).
- Lưu ý sandbox: không có `.env` sẵn trong checkout (chỉ `.env.example`) → phải tự tạo `.env` (DATABASE_URL trỏ DB sandbox đã seed, `AUTH_SECRET` + `PHONE_ENC_KEY` sinh mới bằng `openssl rand`) thì `next dev` mới đọc được biến môi trường để test luồng đăng nhập/JWT.

## Tổng quan
- Web app Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4, PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`), JWT (jose) + bcryptjs. Toàn bộ trong thư mục `web/`.
- Mô hình vận hành: 1 **máy chủ** (máy của trung tâm, chạy Docker, giữ dữ liệu) + nhiều **máy con** kết nối qua trình duyệt/PWA. Triển khai bằng các file trong `windows/` (`Chay-Zenith.bat` = cài/cập nhật; `Mo-App.bat` = mở; `Phat-Hanh-Mang.bat`/`Dia-Chi-Co-Dinh.bat` = ra Internet). Ứng dụng máy con: `client/`.
- ⚠️ Kho mã ban đầu là một project C#/WPF (app "ZenithTasks" quản lý dự án cá nhân) — đã **gỡ bỏ** (15/06/2026) vì không liên quan và đang lỗi build dở dang. Kho hiện chỉ còn app phòng khám (`web/`, `windows/`, `client/`).

## Thương hiệu (BẮT BUỘC giữ đúng)
- Tên chính thức: **Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc**. KHÔNG dùng "Zenith" hay tên ngắn "Thẩm mỹ Hồng Phúc".
- Màu thương hiệu: **ĐỎ hoa phượng** (brand = đỏ, `#dc2626`; nhấn = vàng gold). Định nghĩa ở `web/src/app/globals.css` (`--color-brand-*`, `--color-accent-*`).
- Tác giả/hỗ trợ: GĐĐH — BS. Lê Đình Lam · 0941 567 496.

## Cơ chế lương (đã lập trình trong `web/src/lib/payroll.ts`)
- Lương cứng theo **ngày công** (× ngày công ÷ ngày chuẩn, mặc định 26). Lương cứng mặc định: BS 10tr, Điều dưỡng/Tư vấn 8tr (đặt riêng qua trang Lương).
- Tư vấn viên: % theo **tổng doanh thu tháng**, tách khách mới (≤500tr 3% · 500–800 4% · ≥800 5%) / khách cũ (≤200 4% · 200–500 5% · ≥500 6%).
- Bác sĩ: 8% dịch vụ + 10% tư vấn khách cũ. Điều dưỡng: 100k/ca (nhập tay) + 4% tư vấn.
- Thưởng nóng/điều chỉnh nhập tay theo tháng (bảng `PayrollEntry`). Khách "mới" = hồ sơ đầu tiên của khách; "cũ" = đã có hồ sơ trước.

## Quy ước kỹ thuật quan trọng
- **Xóa / xác nhận**: dùng `DeleteButton` / `ConfirmButton` (gọi server action TRỰC TIẾP qua `useTransition` + `router.refresh()`, KHÔNG dùng `<form action>` cho nút xóa vì hay treo ở production).
- **Sửa (edit)**: modal dùng `useActionState` (xem `danh-muc/catalog-forms.tsx` làm mẫu) HOẶC pattern programmatic như trên.
- Đăng nhập KHÔNG phân biệt hoa/thường (`findFirst` + `mode:"insensitive"`). Phiên 30 ngày.
- Múi giờ VN (TZ trong docker-compose). Ngày chấm công dùng `vnDateOnly()` (`web/src/lib/dates.ts`).
- Prisma client lazy (Proxy) ở `web/src/lib/db.ts` — build không cần DATABASE_URL.
- `next.config.ts`: `serverActions.bodySizeLimit: 12mb` (tải ảnh), `allowedOrigins` qua env `APP_ORIGINS`.
- Sau khi đổi schema: `prisma migrate dev` + commit migration (entrypoint chạy `migrate deploy`).

## Nhập tiền có dấu chấm ngăn cách
- Dùng `MoneyInput` (`web/src/components/ui/money-input.tsx`): hiển thị `15.000.000` khi gõ, gửi số thuần qua input ẩn. Có 2 chế độ: không kiểm soát (`defaultValue`) và có kiểm soát (`value` + `onValueChange`, dùng khi cha cần tính tổng). Đã áp dụng: giá dịch vụ (danh mục), lương cứng/thưởng, đơn giá/giảm giá & thanh toán trong hồ sơ.

## Thông tin cá nhân & ảnh đại diện
- Trang `/tai-khoan` (`tai-khoan/page.tsx` + `profile-forms.tsx`): nhân viên tự sửa họ tên, SĐT, ảnh đại diện, đổi mật khẩu. Action ở `web/src/lib/account-actions.ts` (`updateMyProfile`, `updateMyAvatar`). Trường `User.avatarUrl` (migration `add_user_avatar`). `Avatar` nhận prop `src` để hiện ảnh. Link ở menu góc phải header.

## Bảo mật (đã làm trong phiên này)
- **Chống dò mật khẩu**: `web/src/lib/rate-limit.ts` (khoá tạm theo IP + tài khoản) gắn vào `login/actions.ts`.
- **Phân quyền**: `updateAppointmentStatus` đã giới hạn vai trò (trước đây mọi tài khoản đăng nhập đều đổi được).
- **Tải ảnh**: bỏ SVG, bắt buộc đúng định dạng JPG/PNG/WEBP/HEIC.
- **Header bảo mật** trong `next.config.ts`; **bcrypt cost 12**; mật khẩu tối thiểu **8 ký tự**.
- **Khoá bí mật**: `docker-compose.yml` KHÔNG còn nhúng AUTH_SECRET. Entrypoint tự sinh AUTH_SECRET ngẫu nhiên lưu trong volume `zenith_secrets`. Có thể đặt khoá riêng qua file `.env` (xem `.env.example`).
- ⚠️ **Còn phải làm thủ công**: đổi `PHONE_ENC_KEY` (hiện vẫn dùng khoá tương thích cũ để không mất dữ liệu SĐT) → cần viết migration mã hoá lại; đổi mật khẩu `admin/123456`; bật rate-limit của Cloudflare cho `/login`. Cân nhắc đưa ảnh y khoa ra khỏi `public/` và phục vụ qua route có xác thực.

## Liên lạc khách hàng & AI
- **SĐT**: chỉ ADMIN xem số đầy đủ (giải mã ở `khach-hang/[id]/page.tsx`), kèm nút gọi/Zalo/sao chép (`admin-phone.tsx`). Nhân sự khác chỉ thấy 5 số cuối.
- **Nhật ký liên lạc**: dùng `CareMessage` (kênh Zalo/SMS/Gọi/Ghi chú, chiều IN/OUT). Trang `cham-soc` có lọc theo kênh. Ghi nhận thủ công (vì khách dùng **Zalo cá nhân** — không có API).
- **AI soạn tin** (đã làm, chạy khi có key): `web/src/lib/ai.ts` gọi Claude API qua `fetch` (model mặc định `claude-sonnet-4-6`, đổi qua env `ANTHROPIC_MODEL`); action `draftCareMessage` ở `cham-soc/actions.ts`; UI nút "AI soạn tin" trong `care-composer.tsx` (tự ẩn nếu thiếu `ANTHROPIC_API_KEY`). KHÔNG gửi SĐT/dữ liệu nhạy cảm cho AI (chỉ tên + mục đích + dịch vụ gần nhất). Bật bằng cách đặt `ANTHROPIC_API_KEY` trong `.env` (xem `.env.example`).

### Lộ trình Zalo + AI (chưa làm)
- **Zalo OA (Giai đoạn 2)**: khách đang dùng Zalo cá nhân → cần lập **Zalo OA** (oa.zalo.me) + xác minh. Sau đó tích hợp Zalo API: webhook nhận tin (tự lưu vào `CareMessage`), gửi tin từ app (inbox), gắn đúng khách. Token Zalo lưu trong `.env` (KHÔNG commit). Lưu ý chính sách Zalo: trả lời khi khách nhắn trước = free trong hạn mức; tin chủ động = ZNS template trả phí.
- **AI tự trả lời (Giai đoạn 3)**: sau khi có OA → AI tự trả lời FAQ trong cửa sổ cho phép + người duyệt cho việc quan trọng (giá/y khoa). Nhắc tái khám/hỏi thăm chủ động qua ZNS.

## Sổ thu chi (dòng tiền vận hành)
- Model `CashTransaction` (enum `CashType` INCOME/EXPENSE) — migration `cash_transactions`. Danh mục ở `web/src/lib/finance.ts` (16 hạng mục chi + 5 thu, dễ thêm).
- Trang `/thu-chi` (ADMIN/MANAGER): điều hướng theo tháng + xem tháng trước, tổng thu/chi/số dư, lọc Thu/Chi, top hạng mục chi, bảng giao dịch + Thêm/Sửa/Xóa (`thu-chi/actions.ts`, `cash-forms.tsx`). Nav "Thu chi" (icon Coins) trong `rbac.ts`.
- LƯU Ý: sổ này là dòng tiền vận hành nhập tay (mua vật tư, máy móc, tiếp khách…), tách biệt doanh thu dịch vụ (đã tính ở hồ sơ/Báo cáo).

## Lịch làm việc — xem theo tháng
- `lich-lam-viec/page.tsx`: thêm chế độ "Theo tháng" (lưới lịch + điều hướng tháng trước/sau + chọn tháng) bên cạnh "Tuần này". Quản lý xem tất cả, nhân viên xem ca của mình.

## Phân quyền tuỳ chỉnh (RBAC linh hoạt)
- `web/src/lib/permissions.ts` là **nguồn duy nhất**: `MODULES` (mục/menu) + `CAPABILITIES` (năng lực mịn: `case.clinical`, `payment.add`, `payment.manage`, `phone.full`), mỗi key có roles mặc định.
- Mỗi người có thể **thêm/bớt quyền** ngoài mặc định: lưu ở `User.permissions` JSON `{ grant:[], deny:[] }` (migration `user_permissions`). Quyền hiệu lực = (mặc định vai trò ∪ grant) − deny → `userCan(user, key)`.
- Chốt chặn: trang dùng `requireCap("mod:<key>")` (thay cho `requireUser([roles])`); năng lực trong hồ sơ dùng `requireCap("case.clinical"|"payment.add"|"payment.manage")`. Menu = `navForUser(user)`.
- Giao diện admin: trang **Nhân sự** → nút **"Phân quyền"** (`nhan-su/permission-editor.tsx`) — **kéo thả** (hoặc bấm) chuyển quyền giữa 2 cột Bật/Tắt; lưu qua `savePermissions` (tính grant/deny bằng `diffFromDesired`). VD: cấp Lễ tân quyền `mod:ho-so` + `case.clinical` để thêm vật tư/tạo hồ sơ hộ.
- **SĐT**: `phone.full` mặc định ADMIN + **MANAGER** (quản lý nay xem số đầy đủ); nhân viên khác vẫn chỉ 5 số cuối. Có thể cấp `phone.full` cho người cụ thể.
- (rbac.ts cũ giữ `ROLE_LABELS/ROLE_SHORT/isManagerial`; `NAV_ITEMS/navForRole/canAccess` không còn dùng — nav đã chuyển sang `permissions.ts`.)

## Gộp "Khách hàng" + "Hồ sơ điều trị" → "Hồ sơ khách hàng"
- Menu chỉ còn **"Hồ sơ khách hàng"** (`/khach-hang`, icon FolderHeart). Module `ho-so` đặt `hidden:true` (ẩn khỏi menu nhưng vẫn dùng để phân quyền + chốt chặn). Trang khách hàng có nút **"Tất cả hồ sơ điều trị"** → `/ho-so` cho ai có quyền. Vào từng khách vẫn thấy toàn bộ hồ sơ điều trị + mở chi tiết.

## Giảm giá & công nợ (đã rà soát)
- Dữ liệu LUÔN đúng: `finalPrice = đơn giá×SL − giảm`; `totalAmount = Σ finalPrice` (đã trừ giảm); `debtAmount = total − đã trả`. Giảm giá **không** biến thành nợ.
- Đã sửa **hiển thị** ở trang hồ sơ cho rõ: Tổng dịch vụ (trước giảm = total+discount) → Đã giảm → Thành tiền sau giảm (=total) → Đã thanh toán → Còn nợ. VD: 30tr, giảm 5tr → 25tr, trả 20tr → nợ 5tr.

## Giá gốc/ưu đãi + Voucher + Hóa đơn (đợt mới)
- **CaseService.listPrice** = giá gốc; `unitPrice` = giá ưu đãi; `finalPrice = unitPrice*SL − giảm`.
- **Voucher** (`CaseRecord.voucherCode/voucherAmount`): nhập số tiền hoặc % (`updateCaseVoucher`, quyền `payment.manage`), quy ra VND, kẹp ≤ tổng.
- **`recalc()`**: `totalAmount = Σ finalPrice − voucher` (NET) → voucher giảm cả **công nợ lẫn hoa hồng** (commission = net×rate). Doanh thu tiền mặt (dashboard/báo cáo) vẫn theo `payment.amount`. **LƯU Ý**: `totalAmount` giờ là số NET sau voucher (ảnh hưởng leaderboard/LTV — đúng ý chủ).
- **Hóa đơn in**: `/ho-so/[id]/hoa-don` (nút "In hóa đơn" trên hồ sơ). Hiện giá gốc → ưu đãi → voucher → tổng tiết kiệm → còn nợ; SĐT chỉ mask (không giải mã). Print CSS gọn trong `globals.css` (`.invoice-sheet`).

## Nhật ký kiểm toán (audit)
- `web/src/lib/audit.ts` → `audit(actorId, action, {entity,entityId,meta})`. Đã gắn: DELETE_PAYMENT, UPDATE_PAYMENT, DELETE_CASE, APPLY_VOUCHER, DELETE_CARE, REVEAL_PHONE (+ sẵn LOGIN/CREATE/UPDATE/DELETE_CUSTOMER).
- **Hiện SĐT**: `revealPhone(customerId)` (server action, kiểm tra `phone.full` + ghi REVEAL_PHONE) — bấm "Hiện số" mới giải mã (không giải mã lúc render).

## Liền mạch + mobile
- Dashboard: thẻ số liệu bấm được (→ lịch hẹn/báo cáo/khách/hồ sơ). Báo cáo: "Top công nợ" có link **"Mở hồ sơ thu nợ →"**.
- Mobile: Sổ thu chi có **bản thẻ** (`sm:hidden`) song song bảng (`hidden sm:block`); bảng dịch vụ trong hồ sơ ẩn cột "Giá gốc" trên màn nhỏ.
- Dọn mã chết `rbac.ts`; `receiveCustomer` luôn điều hướng (không "im lặng").

## Lộ trình nâng cấp (đang làm lần lượt)
- ✅ **#1 Sao lưu offsite**: `windows/Sao-Luu.ps1` đẩy bản .zip ra thư mục Google Drive/USB (config `zenith-sao-luu-offsite.txt`).
- ✅ **#2 Cảnh báo kho**: `Material.minStock/lotNo/expiryDate`; trang Kho cảnh báo tồn thấp + sắp/đã hết hạn.
- ✅ **#3 Lãi/Lỗ + Excel**: Sổ thu chi có thẻ Doanh thu dịch vụ/Thu khác/Chi/Lãi‑Lỗ; route `/thu-chi/export` xuất CSV.
- ✅ **#4 Nhật ký hệ thống**: trang `/nhat-ky` (ADMIN) xem AuditLog. (Thùng rác/xóa mềm: chưa làm — thay đổi lớn, để sau.)
- ✅ **#5 Đặt lịch online**: trang công khai `/dat-lich` (proxy.ts cho phép) — khách tự đặt → tạo Appointment (source "Đặt lịch online", SĐT đầy đủ lưu ở ghi chú để lễ tân gọi lại) → hiện ở Lịch hẹn. Chống spam: honeypot + giới hạn theo IP (`bump` trong rate-limit.ts).
- ⏸️ **#6 Zalo OA + nhắc tự động** (cần lập OA lấy token) · **#7 AI tự trả lời** (cần API key + OA) — TẠM GÁC theo yêu cầu.
- ✅ **#8 Thẻ thành viên + tích điểm** (`lib/loyalty.ts`, tính từ chi tiêu thực).
- ✅ **#9 Đổi PHONE_ENC_KEY** (`prisma/rotate-phone-key.ts` + hướng dẫn) · **2FA TOTP** (`lib/totp.ts`, mặc định tắt; bật ở /tai-khoan; admin có nút Tắt 2FA).
- ✅ **#10 Kiểm thử + CI** (vitest 20 test ở `src/lib/__tests__`; `.github/workflows/ci.yml`).
- ✅ **#11 Cập nhật gần real-time** (`components/ui/auto-refresh.tsx` ở Tổng quan/Lịch hẹn/Tiếp nhận).
- ✅ **#12 Cổng khách hàng**: link riêng `/khach/<token>` (proxy cho phép) — khách tự xem hạng/điểm, lịch sử điều trị, ảnh trước‑sau, công nợ. Tạo/đổi/thu hồi link ở hồ sơ khách (`portal-link.tsx`).

## Hồ sơ nhân sự (HR) + Chấm công nâng cao + Giá niêm yết + Xuất file (đợt mới)
- **Ảnh đại diện**: sửa lỗi không tải được ảnh iPhone (HEIC) — `updateMyAvatar` nhận mọi `image/*` (≤8MB), input `accept="image/*"`. Avatar hiện ở danh sách nhân sự + hồ sơ.
- **Hồ sơ nhân sự đầy đủ**: `User` thêm nhiều trường HR (ngày sinh, giới tính, CCCD, quê quán, địa chỉ, ngân hàng, liên hệ khẩn cấp, chức danh, phòng ban, ngày vào làm, bằng cấp, ghi chú) — migration `staff_hr`. Trang `/nhan-su/[id]` xem hồ sơ theo nhóm + nút **"Sửa hồ sơ"** (`updateStaff`, chỉ ADMIN) chỉnh tất cả + lương cứng + hoa hồng. Tên trong danh sách bấm để mở.
- **Chấm công nâng cao** (`cham-cong`): `upsertAttendance` (ADMIN/MANAGER) thêm/sửa công cho **ngày bất kỳ** (kể cả trước khi có app), nhập giờ vào/ra theo giờ VN, ghi audit `EDIT_ATTENDANCE`. Bộ chọn tháng cho mọi người; thẻ **"Lịch sử của tôi"** xem giờ vào/ra từng ngày (các tháng/năm trước); quản lý bấm **"Chi tiết"** để xem & sửa từng ngày của nhân viên. Modal ở `attendance-editor.tsx`.
- **Giá niêm yết** (`Service.listPrice`, migration `service_list_price`, backfill = giá ưu đãi): danh mục dịch vụ nhập **2 giá** (niêm yết + ưu đãi). Chọn dịch vụ trong hồ sơ tự điền giá gốc = niêm yết → hóa đơn hiện tiết kiệm đúng.
- **Xuất nhiều định dạng**: `lib/xlsx.ts` (tạo .xlsx THẬT, **không thư viện ngoài** — tự dựng ZIP qua `zlib`); `lib/export.ts` (`xlsxResponse`/`wordResponse`/`csvResponse`). Component `ExportMenu` (In-Lưu PDF / Excel .xlsx / Word .doc) ở **Báo cáo, Lương, Thu chi**. Route `/…/export?format=xlsx|doc|csv`. PDF = nút In của trình duyệt (preview). Hóa đơn vẫn dùng In sẵn có. Có test `xlsx.test.ts` (3 test).

## Hoa hồng nhập tay + Tìm kiếm + Doanh số (đợt mới nhất)
- **Bỏ hoàn toàn hoa hồng %**: đã DROP `User.commissionRate` + `CaseRecord.commissionRate` (migration `manual_commission`). Hoa hồng giờ là **số tiền nhập tay**:
  - Hồ sơ: ô "Hoa hồng cộng tác viên (VND)" (`commissionAmount`) — `recalc()` KHÔNG còn tự tính hoa hồng, chỉ tính tổng/đã trả/công nợ.
  - Bảng lương: `PayrollEntry.commission` (nhập tay). `payroll.ts` BỎ toàn bộ logic % theo bậc (tư vấn/bác sĩ/điều dưỡng). Mỗi người: lương cứng (theo ngày công) + hoa hồng + thưởng + điều chỉnh = tổng. Modal Sửa lương có ô "Hoa hồng (tự nhập)". `nurseCases` ngừng dùng (giữ cột cũ).
- **Người tư vấn = bất kỳ nhân sự nào**: `getConsultants()` trả TẤT CẢ nhân sự đang hoạt động (không bắt buộc vai trò Tư vấn viên).
- **Ô chọn có tìm kiếm** (`components/ui/combobox.tsx`): gõ chữ để lọc. Đã áp dụng: chọn dịch vụ + vật tư + người tư vấn + bác sĩ (trong hồ sơ), dịch vụ + người tư vấn (lịch hẹn), hạng mục thu chi. Dùng được 2 kiểu: `value`+`onChange` (kiểm soát) hoặc `name`+`defaultValue` (gửi form).
- **Doanh số tư vấn theo thời gian**: `getSalesSeries()` (reports.ts) → 3 mốc 7 ngày / 12 tháng / 5 năm; biểu đồ cột + đường xu hướng (`bao-cao/sales-chart.tsx`, recharts `ComposedChart` Bar+Line) + chỉ số tăng/giảm kỳ cuối. Đặt ở đầu trang Báo cáo.

## Vai trò Cổ đông + Sửa ngày tạo + Sửa vai trò (đợt mới nhất)
- **Sửa NGÀY TẠO hồ sơ (chỉ ADMIN)**: nút "Sửa ngày tạo" trên hồ sơ điều trị → `updateCaseDate` (requireUser ADMIN, ghi audit EDIT_CASE_DATE). Dùng khi tạo hồ sơ muộn. Ảnh hưởng báo cáo/lương theo tháng (tính theo createdAt).
- **Vai trò CỔ ĐÔNG (SHAREHOLDER)** — migration `shareholder_role` (enum). CHỈ XEM, không thao tác:
  - permissions.ts: thêm SHAREHOLDER vào các module XEM kinh doanh (dashboard, lịch hẹn, hồ sơ khách, hồ sơ điều trị, chăm sóc, báo cáo, thu chi, danh mục, kho). KHÔNG có ở nhân sự/lương/chấm công/lịch làm việc/tiếp nhận/nhật ký (ẩn danh sách & quy mô nhân sự).
  - KHÔNG cấp năng lực nào (không có `phone.full` → SĐT luôn che; không `case.clinical`/`payment.*`). Mọi action mutation đều dùng `requireUser([...])` KHÔNG gồm SHAREHOLDER → an toàn theo thiết kế.
  - UI ẩn nút thêm/sửa/xóa cho cổ đông qua `isShareholder()` (rbac.ts): thu-chi, danh-muc, lịch hẹn (trạng thái → badge tĩnh), chăm sóc. (Các trang khác đã gate sẵn theo vai trò.)
- **Sửa vai trò nhân sự**: form Thêm/Sửa nhân sự dùng `ROLE_LABELS` nên tự có đủ vai trò (gồm Cổ đông) — admin nâng/đổi vai trò bất kỳ. Enum vai trò trong `createStaff`/`updateStaff` đã thêm SHAREHOLDER.

## Khắc phục lỗi & phục hồi cập nhật
- `web/src/app/(app)/error.tsx`: ranh giới lỗi thân thiện (Thử lại / về Tổng quan) cho mọi trang khu vực app — không còn màn hình "lỗi máy chủ" trắng; tự phục hồi nếu lỗi tạm thời.
- `windows/Sua-Loi.bat` + `Sua-Loi.ps1`: CẬP NHẬT SẠCH (git reset --hard origin + `docker compose build --no-cache` + `up --force-recreate`) để mã + Prisma client + DB khớp nhau. Dùng khi cập nhật bị lỡ dở gây lệch schema (triệu chứng: mở hồ sơ báo lỗi máy chủ). Báo rõ nếu build thất bại (thường do thiếu RAM), KHÔNG mất dữ liệu.

## CÒN LÀM (TODO)
Đã có Sửa: Khách hàng, Hồ sơ, Dịch vụ & Vật tư (danh mục, 2 giá), Lịch hẹn, Chăm sóc, Lương, **Dịch vụ/Vật tư/Thanh toán trong hồ sơ**, **Nhân sự (hồ sơ HR đầy đủ)**, **Chấm công (ngày bất kỳ)**.
Chưa có Sửa (cần bổ sung):
- **Ca làm việc** (Shift): sửa giờ.
- (Cân nhắc) nhân sự bệnh viện điều động: cờ "lương cố định, không trừ ngày công".
- (Cân nhắc) Word/Excel cho từng hóa đơn (hiện chỉ In/PDF).

## Bật AI nhanh (Windows)
`windows/Cai-AI-Key.bat` — nhập API key Anthropic, tự ghi `ANTHROPIC_API_KEY` vào `.env` (UTF-8 không BOM, giữ các dòng khác) rồi `docker compose up -d` để áp dụng.

## Cách chạy/kiểm thử nhanh trong sandbox
- PG: `pg_ctlcluster 16 main start`; `DATABASE_URL=postgresql://zenith:zenith_dev_pw@127.0.0.1:5432/zenith_clinic?schema=public`.
- Kiểm tra biên dịch: `cd web && npx tsc --noEmit` (full `next build` hay bị kill vì RAM trong sandbox — dùng tsc).
- Dev: `npx next dev -p <port>`.

## SỬA LỖI QUAN TRỌNG: trùng mã hồ sơ khi "Mở hồ sơ điều trị" (P2002)
- Triệu chứng: bấm "Mở hồ sơ điều trị" báo lỗi máy chủ (digest 3788933152). Log: `prisma.caseRecord.create() Unique constraint failed (code)`.
- Nguyên nhân: `lib/codes.ts` sinh mã bằng `count()+1` → sau khi XÓA bản ghi, count < max nên mã mới trùng mã cũ. (Đã CMR: xóa 1 hồ sơ → count=29,max=HS00030 → count+1=HS00030 TRÙNG.)
- Sửa: `lib/seq.ts` (`nextSeq` = max+1, thuần, có test `codes.test.ts`) dùng cho `nextCustomerCode`/`nextCaseCode`; thêm vòng lặp thử lại khi P2002 (`isUniqueViolation`) trong `tiep-nhan/actions.ts` (createCustomer + receiveCustomer). Không đổi schema.

## Đợt sửa lớn: đếm số liệu, trạng thái khách, đổi vai trò, tìm kiếm danh mục
- **Đồng bộ đếm ca (sửa "8 vs 9")**: `dashboard.ts` — `consultRate.total` giờ = TỔNG ca tháng (`count(createdAt month)`) thay vì chỉ ca đã tư vấn → khớp "Số ca tháng này". Tỉ lệ chốt = AGREED / tổng ca (mẫu số = số ca, trực quan & nhất quán giữa Tổng quan và Báo cáo).
- **Hiệu suất tư vấn — bác sĩ kiêm tư vấn**: `nameMap` lấy từ TẤT CẢ user (không chỉ CONSULTANT) → người tư vấn là bác sĩ/QTV hiện đúng tên thay vì "—". (`getConsultants` đã trả mọi nhân sự đang hoạt động.)
- **Hồ sơ khách hàng — cột Trạng thái** (thay mã KH vô nghĩa): Đã làm dịch vụ (có ca SERVICED/COMPLETED) / Đã hủy (tất cả ca CANCELLED) / Chưa làm. Thêm **tab lọc**: Tất cả · Chưa làm dịch vụ · Đã làm dịch vụ (giúp lọc khách chưa làm để chăm sóc).
- **Đổi/nâng cấp vai trò**: nút **"Sửa hồ sơ"** (modal `EditStaffButton`) giờ nằm ngay trên TỪNG DÒNG ở trang Nhân sự (không cần vào trang chi tiết) → đổi vai trò (gồm Cổ đông) tại chỗ, KHÔNG phải xóa tài khoản. `updateStaff` ghi `role`.
- **Tìm kiếm danh mục**: trang Danh mục có ô tìm dịch vụ/vật tư theo tên (`?q`).
- **Tiếp nhận**: khách hẹn hôm nay CHƯA có hồ sơ → nút **"Tạo hồ sơ"** (NewCustomerButton prefill tên/nguồn/ghi chú từ lịch hẹn) để chuyển tiếp lập hồ sơ.
- **Đồng bộ khi sửa ngày tạo**: `refresh()` trong `ho-so/actions.ts` revalidate thêm `/bao-cao` + `/khach-hang`.

## Doanh thu/Lãi-Lỗ chuyển sang Báo cáo; Sổ thu chi chỉ còn dòng tiền
- **Sổ thu chi** (`thu-chi/page.tsx`): BỎ thẻ "Doanh thu dịch vụ" + "Lãi/Lỗ" (để kế toán/lễ tân nhập sổ không thấy doanh thu/lãi lỗ). Chỉ còn: Tổng thu / Tổng chi / **Số dư sổ** (thu − chi của sổ, KHÔNG gồm doanh thu dịch vụ).
- **Báo cáo** (`bao-cao/page.tsx`): thêm khối **Lãi/Lỗ tháng** = Doanh thu dịch vụ (từ hồ sơ) + Thu khác − Tổng chi. Helper `getMonthlyPnl()` ở `reports.ts`. Chỉ ADMIN/MANAGER/SHAREHOLDER (quyền `mod:bao-cao`) xem.
- **Hạng mục thu** (`finance.ts`): bỏ "Doanh thu dịch vụ" khỏi sổ thu chi, thêm **"Ứng từ doanh thu để chi trả"** (mã `ADVANCE_REVENUE`). `REVENUE_TRANSFER_CODES` (ADVANCE_REVENUE + SERVICE cũ) bị LOẠI khỏi "Thu khác" trong Lãi/Lỗ để tránh tính trùng doanh thu.

## Hiệu suất nhân sự + Cộng tác viên (2 module mới) + xếp hạng dịch vụ
- **Dịch vụ nổi bật**: xếp theo SỐ LƯỢT (rồi doanh thu) thay vì chỉ doanh thu (`reports.ts` topServices sort).
- **Module `hieu-suat`** (Hiệu suất nhân sự — ADMIN/MANAGER/SHAREHOLDER): `lib/performance.ts` `getStaffPerformance/getStaffDetail`. Trang `/hieu-suat` (bảng: ngày công, ca tư vấn, chốt%, DS tư vấn, ca mổ, DS mổ, tin CSKH) → bấm vào người mở `/hieu-suat/[id]` xem TỪNG CA (tư vấn + mổ, link sang hồ sơ). Báo cáo: hàng tư vấn/bác sĩ giờ link sang `/hieu-suat/[id]`.
- **Module `cong-tac-vien`** (Cộng tác viên — ADMIN/MANAGER/SHAREHOLDER): gộp theo `Customer.sourceDetail` (nguồn=COLLABORATOR). `/cong-tac-vien` so sánh CTV theo 7 ngày/tháng/năm/tất cả (số khách, số ca, doanh số, hoa hồng) → `/cong-tac-vien/[tên]` xem hồ sơ khách CTV giới thiệu + từng ca. (Chưa có hồ sơ CTV sửa được — đề xuất thêm model `Collaborator` nếu cần.)
- Icon nav: thêm `Activity`, `Handshake` vào `app-shell.tsx`.

## Sửa ngày thu tiền (ADMIN) + Biểu đồ đa kiểu + Biểu đồ CTV
- **Sửa NGÀY thu tiền**: `updatePayment` cho phép ADMIN sửa `paidAt` (ô "Ngày thu tiền" trong modal Sửa khoản thu, chỉ hiện với ADMIN) — để cập nhật số liệu cũ cho báo cáo/doanh thu đúng kỳ. Ghi audit. `refresh()` revalidate báo cáo/dashboard.
- **Biểu đồ đa kiểu** `components/ui/multi-chart.tsx` (recharts): chọn Cột / Đường / Vùng / Tròn. Áp dụng: Báo cáo (doanh thu 14 ngày + doanh số tư vấn), Tổng quan (doanh thu — `components/charts/revenue-chart.tsx` nay dùng MultiChart), Cộng tác viên.
- **Mốc tuần**: `getSalesSeries()` thêm `thisWeek` (T2..CN) + `weeksOfMonth` (Tuần 1..N của tháng). SalesChart có tab: Tuần này / Tuần-tháng / 7 ngày / 12 tháng / 5 năm + kèm % tăng/giảm kỳ cuối.
- **Biểu đồ CTV**: trang `/cong-tac-vien` có biểu đồ so sánh top 10 CTV theo doanh số (cột/tròn); trang chi tiết CTV có biểu đồ **xu hướng 12 tháng** (`getCollaboratorTrend`).
- Đã bỏ `bao-cao/revenue-chart.tsx` cũ (thay bằng MultiChart).

## Quyền Thu chi cho tư vấn/lễ tân — GỘP 1 quyền (đơn giản)
- Bỏ ý tưởng `cash.write` riêng (gây rắc rối phải cấp 2 quyền). Nay **chỉ cần cấp 1 quyền "Thu chi" (`mod:thu-chi`)** là nhân sự VÀO được + GHI được.
- `thu-chi/actions.ts` (create/update/delete): `requireCap("mod:thu-chi")` + chặn nếu `isShareholder` (cổ đông chỉ xem).
- `thu-chi/page.tsx`: `canManage = !isShareholder(user.role)` (ai có mod:thu-chi & không phải cổ đông thì thấy nút Thêm/Sửa/Xóa).
- Cách dùng: Nhân sự → Phân quyền → bật **"Thu chi"** cho tư vấn/lễ tân là họ nhập được ngay. Cổ đông có mod:thu-chi nhưng là view-only → chỉ xem.

## Sửa: ảnh không hiện + sửa CTV không lưu + biểu đồ tăng trưởng CTV
- **Ảnh trước/sau không hiện** (production không phục vụ tệp ghi runtime trong public/): thêm route `app/media/[file]/route.ts` đọc tệp từ `public/uploads` và trả về kèm Content-Type (đáng tin cậy, không cần đăng nhập để cổng khách `/khach/[token]` vẫn xem được). `uploadPhoto` lưu URL `/media/<tệp>`; helper `lib/media.ts photoSrc()` map URL cũ `/uploads/<tệp>` → `/media/<tệp>`. Đã đổi `<img>` ở hồ sơ điều trị, hồ sơ khách, cổng khách.
- **Đăng ký/sửa CTV không cập nhật**: `EditCollaboratorButton`/`NewCollaboratorButton` gọi `router.refresh()` sau khi lưu; action `revalidatePath("/cong-tac-vien","layout")` (bao trang chi tiết). KHÓA ô Tên khi sửa/đăng-ký-theo-tên (tránh đổi tên làm lệch khớp với `sourceDetail`).
- **Biểu đồ tăng trưởng CTV**: `getCollaboratorSeries(name?)` (tuần này / các tuần trong tháng / 12 tháng / 5 năm). Component dùng chung `components/ui/range-chart.tsx` (chọn mốc + chọn kiểu cột/đường/vùng/tròn + % tăng giảm). Trang CTV: thêm "Tăng trưởng doanh số CTV" (tất cả CTV) + giữ "So sánh top 10". Trang chi tiết CTV: đổi sang RangeChart theo tuần/tháng/năm.

## Lưu mãi/"xoay mãi" + Xem ảnh + Ảnh cận lâm sàng + Lưu trữ ở máy phòng khám (đợt mới nhất)
### 1) Lưu xong nhưng "xoay mãi" (gặp ở TẤT CẢ form)
- **Nguyên nhân**: form dùng `useActionState`; server action gọi `revalidatePath(...)` nên Next **gộp việc render lại cả trang vào phản hồi** của action → spinner phải đợi tải lại toàn trang (rất lâu khi mạng tới máy chủ phòng khám chậm), dù dữ liệu ĐÃ lưu xong (nên bấm Hủy vẫn thấy đã lưu).
- **Cách sửa**: hook mới `lib/use-form-action.ts` (`useFormAction`) — API y hệt `useActionState` (`[state, action, pending]`):
  - `pending` TẮT NGAY khi máy chủ lưu xong (không chờ tải lại trang), đóng form, rồi `router.refresh()` ở chế độ NỀN để cập nhật dữ liệu trang hiện tại.
  - Có bắt lỗi mạng → hiện "Không lưu được — kiểm tra kết nối và thử lại."; KHÔNG nuốt `redirect()/notFound()` của Next.
- **Bỏ `revalidatePath` ở các action lưu** (giữ lại cho action XÓA dùng `<form action>`): vì mọi trang dữ liệu đều `force-dynamic` (tự tải mới khi mở) nên `revalidatePath` thừa; trang hiện tại đã được `router.refresh()` lo.
- **Đã áp dụng cho** (save-and-stay): hồ sơ điều trị (dịch vụ/thanh toán/vật tư/ảnh/voucher/thông tin/ngày tạo/tái khám), danh mục (dịch vụ/vật tư), thu chi, cộng tác viên, sửa khách hàng, hồ sơ nhân sự (thêm/sửa), chấm công, chăm sóc (soạn + sửa tin), lịch hẹn (thêm/sửa), xếp ca, tài khoản (thông tin + ảnh đại diện + đổi mật khẩu). Các form điều hướng (đăng nhập, tiếp nhận, đặt lịch) hoặc có màn hình "thành công" (đặt lại mật khẩu, 2FA) KHÔNG bị lỗi này nên giữ nguyên.
### 2) Xem được ảnh khi bấm + tải nhanh hơn
- **Thư viện ảnh** `components/ui/photo-gallery.tsx`: lưới ảnh thu nhỏ (tải lười `loading="lazy"` → tiết kiệm băng thông, chỉ tải khi cuộn tới), **bấm để xem ảnh lớn** (overlay toàn màn hình, ◀▶/Esc, nút **Tải về**), bấm thùng rác để xóa (nếu có quyền). Dùng ở: hồ sơ điều trị (xóa được), hồ sơ khách, cổng khách `/khach/[token]` (chỉ xem).
- **Nén ảnh trước khi tải** `lib/compress-image.ts` (`compressImage`): resize ≤1920px + JPEG q0.82 ngay trên máy/điện thoại trước khi gửi → tải nhanh hơn nhiều, nhẹ kho. Áp dụng cho tải ảnh hồ sơ **và** ảnh đại diện. HEIC iPhone tự fallback.
### 3) Ảnh cận lâm sàng
- Thêm loại ảnh `PhotoType.CLINICAL` (migration `20260619230000_photo_clinical`) — chọn "Cận lâm sàng (X-quang/CT/siêu âm)" khi tải ảnh; nhãn vàng "Cận lâm sàng" (`photo-label.tsx`).
### 4) Lưu trữ ở máy phòng khám, tải về khi cần xem (đúng ý chủ)
- Ảnh/tệp lưu ở **chính máy chủ phòng khám** trong volume Docker `zenith_uploads` (`docker-compose.yml` gốc), KHÔNG mất khi cập nhật/`build --no-cache`. Phục vụ **theo yêu cầu** qua route `/media/[file]` — bản web chỉ hiện thu nhỏ, bấm mới tải ảnh đầy đủ từ máy về xem.
- **An toàn dù xóa ở điện thoại**: ảnh đã nằm ở máy phòng khám; `windows/Sao-Luu.ps1` sao lưu cả DB **lẫn** thư mục `uploads` ra ổ ngoài/Google Drive. (Lưu ý: `web/docker-compose.yml` chỉ là DB cho lập trình — KHÔNG dùng khi vận hành; script Windows luôn chạy compose ở thư mục gốc.)
