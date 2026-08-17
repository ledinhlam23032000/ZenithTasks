@echo off
setlocal
title Zenith Clinic - Cap nhat master va chay

set "SCRIPT=%~dp0Chay-Zenith.ps1"
if not exist "%SCRIPT%" (
  echo Khong tim thay %SCRIPT%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Cap nhat hoac khoi dong that bai. Xem loi o phia tren.
)
echo.
echo Co the dong cua so nay. Ung dung van chay trong Docker.
pause
exit /b %EXIT_CODE%
