@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cau-Hinh-AI-QA.ps1"
if errorlevel 1 (
  echo.
  echo Cau hinh QA that bai. Kiem tra thong bao phia tren.
  pause
  exit /b 1
)
echo.
echo QA DeepSeek da san sang. Cua so nay se dong sau khi anh bam phim.
pause
endlocal
