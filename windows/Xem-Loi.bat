@echo off
title Xem loi - Zenith Clinic
cd /d "%~dp0.."
echo Dang tu kiem tra Zenith Clinic (chi doc, khong sua CSDL)...
echo.
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Xem-Loi.ps1"
echo.
pause
