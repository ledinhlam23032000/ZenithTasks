@echo off
title Cai bao tri kenh Zalo va Facebook - ZenithTasks
reg query "HKU\S-1-5-19" >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cai-Bao-Tri-Kenh.ps1"
if %errorlevel% NEQ 0 (
  echo.
  echo Cai dat that bai. Doc thong bao phia tren.
  pause
  exit /b 1
)
echo.
echo Da cai bao tri kenh tu dong moi 12 gio.
pause
