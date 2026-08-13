# ZenithTasks E2E

Các test này chỉ chạy đầy đủ khi có môi trường disposable:

```powershell
$env:E2E_RUN_REAL="true"
$env:E2E_BASE_URL="http://127.0.0.1:3000"
npm run test:e2e
```

Môi trường CI phải dùng database và media giả riêng, chạy migration + seed test trước khi bật `E2E_RUN_REAL`. Không dùng database bệnh nhân thật. Các scenario role-based (ADMIN, MANAGER, DOCTOR, NURSE, CONSULTANT, RECEPTION, TELESALE, CARE, SHAREHOLDER) cần được mở rộng cùng test fixtures trước khi release thương mại.
