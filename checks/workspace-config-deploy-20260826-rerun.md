# Evidence deploy config/workspace rerun — 2026-08-26

## Kết quả đã quan sát

| Kiểm tra | Kết quả |
|---|---|
| Docker engine | Server `29.7.2` phản hồi trước khi chạy updater |
| Checkout clinic | Đã fetch master tới `7ecb61a` trong run updater |
| Build | Docker image `zenithtasks-app` build xong; Next production build báo `Compiled successfully`, TypeScript hoàn tất và Prisma Client generate thành công |
| Recreate/migration | App log ghi `Applying migration 20260826120000_workspace_config_versions` và `All migrations have been successfully applied.` |
| Migration DB | `68` migration rows đã hoàn tất; migration mới nhất là `20260826120000_workspace_config_versions` |
| Runtime | `app|running`, `db|running|healthy` |
| HTTP | `/login` trả `200` |
| Process | Sau hậu kiểm không còn process `Sua-Loi.bat`/`Sua-Loi.ps1`; không chạy updater thứ hai |

## Giới hạn bằng chứng

Sidecar bị timeout/ngắt trong lúc wrapper đang build nên không thu trực tiếp được dòng cuối `DA XONG` và exit code của cửa sổ batch. Tuy nhiên image đã build, app đã recreate/migrate, migration đã up-to-date, container running/healthy và HTTP `/login` 200. Vì vậy evidence đủ để xác nhận **runtime đã nhận bản build và migration**, nhưng không ghi claim rằng đã thu được exit code `0` của wrapper trong phiên này.

Không có thao tác `prisma db push`, `migrate reset`, `docker compose down -v`, xóa volume hoặc dữ liệu nghiệp vụ Nội Bộ.
