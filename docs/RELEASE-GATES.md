# Release gates

## Gate 0 — Không mất dữ liệu và không lộ dữ liệu

- [ ] Không còn P1 về cross-case mutation.
- [ ] Media và uploads được authorize theo hồ sơ/khách hàng.
- [ ] SHAREHOLDER chỉ xem aggregate.
- [ ] RECEPTION/TELESALE không sửa trường lâm sàng.
- [ ] 2FA bắt buộc với quyền cao.
- [ ] Không có key/secret trong Git hoặc artifact.

## Gate 1 — Tiền và kho

- [ ] Thiếu kho được chặn hoặc có approval riêng.
- [ ] Thêm, sửa, đổi, xóa dịch vụ tạo đúng movement và reversal.
- [ ] Double-submit payment không nhân đôi giao dịch.
- [ ] Hoàn tiền là giao dịch điều chỉnh có audit.
- [ ] Debt plan không tồn tại trên case không còn nợ.
- [ ] Hồ sơ nghiệp vụ được archive, không hard-delete mặc định.

## Gate 2 — Quy trình người dùng

- [ ] Public booking giữ dữ liệu khi validation fail.
- [ ] Reception hoàn thành intake từ khách cũ mà không nhập lại dữ liệu.
- [ ] Doctor thấy cảnh báo và timeline trong vài thao tác.
- [ ] Nurse dùng được trên tablet.
- [ ] Care có unread, assignment và SLA.
- [ ] Shareholder thấy dashboard không định danh.

## Gate 3 — Chất lượng kỹ thuật

- [ ] `npx tsc --noEmit` pass.
- [ ] `npx vitest run` pass.
- [ ] `npx eslint .` pass.
- [ ] `npm run build` pass.
- [ ] Playwright critical paths pass.
- [ ] Accessibility smoke tests pass.
- [ ] Backup và restore drill pass.

## Gate 4 — Commercial ready

- [ ] Đổi tên/logo/màu/hotline không sửa code.
- [ ] Onboarding tạo được clinic mới.
- [ ] Mỗi clinic có database/media riêng.
- [ ] Có tài liệu install, upgrade, backup, support và troubleshooting.
- [ ] Có staging seed và demo checklist.
- [ ] Draft PR được review và không còn finding load-bearing.

