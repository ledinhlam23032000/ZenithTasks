@echo off
title Khoi phuc khan cap - Zenith Clinic
>"%TEMP%\zlvl_khoiphuc.txt" 2>&1 reg query "HKU\S-1-5-19"
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
echo Dang khoi phuc + cap nhat Zenith Clinic (chay 1 lan cho su co hien tai)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Khoi-Phuc-Khan-Cap.ps1"
echo.
echo (Da xong. Co the dong cua so nay.)
pause
