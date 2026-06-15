@echo off
title Cai dat sao luu tu dong - Zenith Clinic
rem Can quyen Admin de hen lich Task Scheduler
reg query "HKU\S-1-5-19" >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Xin quyen Quan tri - bam YES o cua so sap hien ra...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cai-Sao-Luu-Tu-Dong.ps1"
