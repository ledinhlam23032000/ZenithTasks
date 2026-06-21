@echo off
title Sua loi / Cap nhat sach - Zenith Clinic
>"%TEMP%\zlvl_sualoi.txt" 2>&1 reg query "HKU\S-1-5-19"
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
echo Dang sua loi / cap nhat sach Zenith Clinic...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sua-Loi.ps1"
echo.
echo (Da xong. Co the dong cua so nay.)
pause
