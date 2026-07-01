# ============================================================================
#  Cai dat TU DONG CAP NHAT hang ngay (dung Windows Task Scheduler).
#  Hen lich 02:00 moi ngay (luc phong kham dong cua) tu kiem tra + cap nhat
#  ban moi nhat tu GitHub - khong can bam Chay-Zenith.bat/Sua-Loi.bat tay nua.
# ============================================================================
$ErrorActionPreference = 'Stop'
$ps1 = Join-Path $PSScriptRoot 'Tu-Dong-Cap-Nhat.ps1'
$log = Join-Path $env:USERPROFILE 'zenith-tu-dong-cap-nhat.log'

Write-Host ''
Write-Host '===================================================' -ForegroundColor Cyan
Write-Host '   CAI DAT TU DONG CAP NHAT - ZENITH CLINIC' -ForegroundColor Cyan
Write-Host '===================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Tu nay, moi ngay luc 02:00 sang may se TU KIEM TRA xem GitHub co ban' -ForegroundColor Yellow
Write-Host 'moi khong. Neu co, tu dong tai ve + dung lai ung dung (khong can bam gi ca).' -ForegroundColor Yellow
Write-Host 'Neu cap nhat bi loi, ung dung VAN GIU BAN CU dang chay - khong gian doan.' -ForegroundColor Yellow
Write-Host ''

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName 'ZenithTuDongCapNhat' -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force -Description 'Tu dong cap nhat phan mem phong kham hang ngay luc 2h sang' | Out-Null

Write-Host 'Da hen lich: 02:00 moi ngay tu dong kiem tra + cap nhat.' -ForegroundColor Green
Write-Host "Nhat ky moi lan chay xem tai: $log" -ForegroundColor Green
Write-Host ''
Write-Host 'Dang chay thu 1 lan ngay bay gio de kiem tra...' -ForegroundColor Yellow
& powershell -NoProfile -ExecutionPolicy Bypass -File $ps1
if (Test-Path $log) { Write-Host ''; Write-Host '--- Nhat ky vua chay ---' -ForegroundColor Cyan; Get-Content $log -Tail 10 }
Write-Host ''
Write-Host '================== DA XONG ==================' -ForegroundColor Green
Write-Host ' Muon TAT tinh nang nay: mo "Task Scheduler" (Windows), tim muc' -ForegroundColor DarkGray
Write-Host ' "ZenithTuDongCapNhat" roi bam Disable hoac Delete.' -ForegroundColor DarkGray
Write-Host '=============================================' -ForegroundColor Green
Read-Host 'Nhan Enter de dong'
