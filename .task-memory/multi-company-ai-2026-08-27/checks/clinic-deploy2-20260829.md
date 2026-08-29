# Triển khai clinic wave 2 — 2026-08-29

Owner: "test xong up bản vá vào phần mềm thật nhé" (2026-08-28/29).

## Backup trước deploy
`/c/Users/PC/zenith-backup-truoc-deploy2-20260829-135012/clinic.dump` (322KB pg_dump -Fc).

## Nội dung wave này (chỉ code, KHÔNG có migration DB mới)
- fix(P0): payAllSalaries double-submit + gỡ cross-env làm hỏng build (76f7da8)
- fix(P0/tiền): hoa hồng bác sĩ hút phần dịch vụ không gắn bác sĩ (581e38b)
- fix(P0/MC-11): leo thang quyền AI qua toolName (ad2e95b)
- fix(P2/MC-05): AI workspace scope fail-closed (6053355)
- fix(P1): race mất trạng thái cuối kỳ lương (d114b71)
- fix(P2): /du-an chốt bằng capability (45b8265)
- fix(P2/P3): uniqueness đúng phạm vi tenant + index AuditLog (bd009e6, CÓ migration — đã apply ở wave 1)
- test: bằng chứng runtime hoa hồng + double-submit trên dữ liệu QA giống thật (e46527e)
- fix(P1): khoá kỳ kế toán — chấm công + hoa hồng CTV (fd91941)
- fix(P2): deleteMaterial/deleteService không cascade mất lịch sử kho (e9390b8)

## Bằng chứng sau deploy
| Kiểm tra | Kết quả |
|---|---|
| Migration | "No pending migrations to apply" — đúng vì wave này không đổi schema |
| Dữ liệu | Customer=18 Case=20 Payment=18 — không đổi |
| `/login` | 200 |
| Smoke ADMIN | /dashboard /ke-toan /danh-muc /cham-cong /ho-so /luong đều 200 |

## Tổng kết cả 2 wave deploy (2026-08-28 → 08-29)
10 lỗi thật đã sửa và deploy, mỗi lỗi đều có: unit test và/hoặc integration test
trên QA, với 6 trong số đó có thêm bằng chứng runtime trên dữ liệu nghiệp vụ
giống thật (hoa hồng, double-submit, chốt sổ, xóa vật tư) — không chỉ đọc code.
Gate cuối: tsc 0 lỗi; unit 494/494; integration 21/21.
