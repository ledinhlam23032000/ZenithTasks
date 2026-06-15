# ============================================================================
#  Cai dat SAO LUU TU DONG hang ngay (dung Windows Task Scheduler).
#  Hoi noi luu (vi du o dia 2TB cua ban), hen lich 01:00 moi ngay, chay thu 1 lan.
# ============================================================================
$ErrorActionPreference = 'Stop'
$ps1 = Join-Path $PSScriptRoot 'Sao-Luu.ps1'
$cfgFile = Join-Path $env:USERPROFILE 'zenith-sao-luu.txt'

Write-Host ''
Write-Host '===================================================' -ForegroundColor Cyan
Write-Host '   CAI DAT SAO LUU TU DONG - PHONG KHAM' -ForegroundColor Cyan
Write-Host '===================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Nhap o dia / thu muc de luu ban sao luu hang ngay.'
Write-Host 'Vi du:  E:\ZenithBackup   hoac   D:\SaoLuuPhongKham'
Write-Host '(Nen chon o dia trong nhieu - vi du o 2TB cua ban.)'
Write-Host ''
$dest = Read-Host 'Thu muc luu'
if ([string]::IsNullOrWhiteSpace($dest)) { $dest = Join-Path $env:USERPROFILE 'ZenithBackup' }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Set-Content -Path $cfgFile -Value $dest -Encoding UTF8
Write-Host "Se luu vao: $dest" -ForegroundColor Green
Write-Host ''

# Hen lich chay hang ngay luc 1h sang
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 1am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName 'ZenithSaoLuu' -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force -Description 'Sao luu du lieu phong kham hang ngay' | Out-Null
Write-Host 'Da hen lich: 01:00 moi ngay (tu dong sao luu).' -ForegroundColor Green
Write-Host ''

Write-Host 'Dang chay sao luu thu lan dau...' -ForegroundColor Yellow
& powershell -NoProfile -ExecutionPolicy Bypass -File $ps1
Write-Host ''
Write-Host '================== DA XONG ==================' -ForegroundColor Green
Write-Host " Ban sao luu nam trong: $dest" -ForegroundColor Green
Write-Host ' Tu nay he thong tu sao luu moi ngay luc 1h sang.' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
Read-Host 'Nhan Enter de dong'
