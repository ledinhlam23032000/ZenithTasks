@echo off
title Sua loi / Cap nhat sach - Zenith Clinic
>"%TEMP%\zlevel2.txt" 2>&1 reg query "HKU\S-1-5-19"
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
echo Dang sua loi / cap nhat sach Zenith Clinic, vui long doi...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sua-Loi.ps1"
