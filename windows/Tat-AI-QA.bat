@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tat-AI-QA.ps1"
if errorlevel 1 (
  echo.
  echo Don QA that bai. Kiem tra thong bao phia tren.
  pause
  exit /b 1
)
echo.
echo Da tat QA va xoa secret local.
pause
endlocal
