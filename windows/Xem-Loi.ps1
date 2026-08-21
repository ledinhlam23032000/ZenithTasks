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

"`n--- 1) TRANG THAI MIGRATION (CSDL) ---" | Out-File -FilePath $Out -Append -Encoding utf8
$migrationStatus = & docker compose exec -T app npx prisma migrate status 2>&1
$migrationStatus | Out-File -FilePath $Out -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { "[XEM-LOI] docker compose exec prisma migrate status exit code: $LASTEXITCODE" | Out-File -FilePath $Out -Append -Encoding utf8 }

"`n--- 2) LOG UNG DUNG (150 dong cuoi) ---" | Out-File -FilePath $Out -Append -Encoding utf8
$appLogs = & docker compose logs --tail=150 app 2>&1
$appLogs | Out-File -FilePath $Out -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { "[XEM-LOI] docker compose logs app exit code: $LASTEXITCODE" | Out-File -FilePath $Out -Append -Encoding utf8 }

Write-Host ""
Write-Host "Da luu thong tin loi ra file:" -ForegroundColor Green
Write-Host "   $Out" -ForegroundColor Green
Write-Host "Hay GUI file (hoac chup man hinh) nay cho ky thuat." -ForegroundColor Green
try { Start-Process notepad.exe $Out } catch {}
EndHere 0
