@echo off
setlocal
title Zenith Clinic - Cap nhat master va chay

set "SCRIPT=%~dp0Chay-Zenith.ps1"
if not exist "%SCRIPT%" (
  echo Khong tim thay %SCRIPT%
  pause
  exit /b 1
)

>"%TEMP%\zenith-admin-check.txt" 2>&1 reg query "HKU\S-1-5-19"
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (
  echo.
  echo Cap nhat hoac khoi dong that bai. Xem loi o phia tren.
)
echo.
echo Co the dong cua so nay. Ung dung van chay trong Docker.
pause
