@echo off
title Xem loi - Zenith Clinic
>"%TEMP%\zlvl_xemloi.txt" 2>&1 reg query "HKU\S-1-5-19"
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
echo Dang lay thong bao loi cua may chu...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Xem-Loi.ps1"
echo.
pause
