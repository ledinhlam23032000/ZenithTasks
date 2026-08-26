# Evidence deploy batch ledger/reconciliation/payroll — 2026-08-26

| Kiểm tra | Kết quả |
|---|---|
| Wrapper | `windows\Sua-Loi-launch.log` ghi `END exit=0` lúc `21:39:49` |
| Clinic checkout | SHA `5d38fc0a74796e5c29f36d577e8b6e6dd7e224e7` |
| Database migrations | `71` migration rows đã hoàn tất |
| Migration mới nhất | `20260826150000_workspace_payroll_runs` |
| Các migration batch | `20260826130000_workspace_ledger_entries`, `20260826140000_workspace_payment_reconciliation`, `20260826150000_workspace_payroll_runs` |
| App log | Ghi cả ba migration apply, `All migrations have been successfully applied.`, `Ready in 468ms` |
| Runtime | `app|running`, `db|running|healthy` |
| HTTP | `/login` trả `200` |

## Phạm vi đã deploy

Batch này đưa ledger project-local, payment reconciliation project-local, PayrollRun/PayrollLine snapshot foundation, ledger/reconciliation UI và PayrollRun DRAFT route/action lên runtime clinic. Payroll menu vẫn chưa bật; finalize/void/calculation/commission policy vẫn chưa hoàn tất.

Không dùng `prisma db push`, `migrate reset`, `docker compose down -v`; không xóa volume, upload hoặc dữ liệu Nội Bộ.
