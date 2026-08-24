@echo off
title Sua loi / Cap nhat sach - Zenith Clinic
cd /d "%~dp0"
echo Dang sua loi / cap nhat sach Zenith Clinic...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sua-Loi.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo Cap nhat that bai. Hay chay Xem-Loi.bat va giu lai log de kiem tra.
) else (
  echo Da hoan tat cap nhat. Co the dong cua so nay.
)
pause
exit /b %EXIT_CODE%
