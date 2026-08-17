# ============================================================================
#  XEM LOI - Zenith Clinic
#  Thu thap thong bao loi that cua may chu (trang thai CSDL + log ung dung)
#  luu ra file tren Desktop de gui cho ky thuat sua dut diem.
# ============================================================================
$Dir = Join-Path $HOME "ZenithTasks"
$Out = Join-Path ([Environment]::GetFolderPath("Desktop")) "zenith-loi.txt"

function EndHere($code) { Write-Host ""; Read-Host "Nhan Enter de dong cua so"; exit $code }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Khong tim thay docker. Hay chay Chay-Zenith.bat truoc." -ForegroundColor Red
  EndHere 1
}
if (-not (Test-Path $Dir)) {
  Write-Host "Khong tim thay thu muc ung dung: $Dir" -ForegroundColor Red
  EndHere 1
}
Set-Location $Dir

Write-Host "Dang thu thap thong tin loi..." -ForegroundColor Cyan
"==== NHAT KY LOI ZENITH ($(Get-Date)) ====" | Out-File -FilePath $Out -Encoding utf8

# LUU Y thu tu: nhung muc KHONG can container app dang chay phai dung TRUOC,
# vi khi app chet thi 'docker compose exec' se that bai - neu de no dau tien
# thi mat luon cac thong tin quan trong con lai.

"`n--- 1) PHIEN BAN MA NGUON DANG DUNG ---" | Out-File -FilePath $Out -Append -Encoding utf8
git -C $Dir rev-parse --abbrev-ref HEAD *>> $Out
git -C $Dir log -1 --oneline *>> $Out

"`n--- 2) TRANG THAI CAC CONTAINER (chay/tat/khoi dong lai lien tuc?) ---" | Out-File -FilePath $Out -Append -Encoding utf8
docker compose ps -a *>> $Out

"`n--- 3) LOG UNG DUNG (200 dong cuoi - lay duoc CA KHI app da tat) ---" | Out-File -FilePath $Out -Append -Encoding utf8
docker compose logs --tail=200 app *>> $Out

"`n--- 4) LOG CO SO DU LIEU (60 dong cuoi) ---" | Out-File -FilePath $Out -Append -Encoding utf8
docker compose logs --tail=60 db *>> $Out

"`n--- 5) DANH SACH CAP NHAT CSDL DA AP DUNG (doc thang tu CSDL) ---" | Out-File -FilePath $Out -Append -Encoding utf8
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at, rolled_back_at from _prisma_migrations order by started_at;"' *>> $Out

"`n--- 6) TRANG THAI MIGRATION THEO PRISMA (can app dang chay - co the bo trong) ---" | Out-File -FilePath $Out -Append -Encoding utf8
docker compose exec -T app npx prisma migrate status *>> $Out

Write-Host ""
Write-Host "Da luu thong tin loi ra file:" -ForegroundColor Green
Write-Host "   $Out" -ForegroundColor Green
Write-Host "Hay GUI file (hoac chup man hinh) nay cho ky thuat." -ForegroundColor Green
try { Start-Process notepad.exe $Out } catch {}
EndHere 0
