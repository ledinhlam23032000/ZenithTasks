@echo off
title Zenith Clinic - Cai dat & Chay tren may nay
echo.
echo   Dang khoi dong trinh cai dat Zenith Clinic...
echo   (Se hien cua so xin quyen Quan tri - bam YES giup nhe)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Zenith-Setup.ps1"
echo.
echo   (Co the dong cua so nay. Ung dung van chay nen trong Docker.)
pause
