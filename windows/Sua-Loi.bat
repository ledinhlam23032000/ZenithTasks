@echo off
setlocal EnableExtensions
set "SCRIPT_DIR=%~dp0"
set "LAUNCH_LOG=%SCRIPT_DIR%Sua-Loi-launch.log"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_EXE%" set "PS_EXE=powershell.exe"

title Sua loi / Cap nhat sach - Zenith Clinic
cd /d "%SCRIPT_DIR%"

echo ==================================================
echo   SUA LOI / CAP NHAT SACH - ZENITH CLINIC
echo ==================================================
echo [0/4] Khoi dong updater tu:
echo        %SCRIPT_DIR%
echo.
>>"%LAUNCH_LOG%" echo [%date% %time%] START Sua-Loi.bat from %SCRIPT_DIR%

if not exist "%SCRIPT_DIR%Sua-Loi.ps1" (
  echo LOI: Khong tim thay Sua-Loi.ps1 trong thu muc updater.
  >>"%LAUNCH_LOG%" echo [%date% %time%] ERROR missing Sua-Loi.ps1
  set "EXIT_CODE=2"
  goto :finish
)

if not exist "%PS_EXE%" (
  echo LOI: Khong tim thay Windows PowerShell.
  >>"%LAUNCH_LOG%" echo [%date% %time%] ERROR missing PowerShell
  set "EXIT_CODE=2"
  goto :finish
)

echo Dang chay PowerShell updater; khong dong cua so nay khi dang build.
echo Log launch: %LAUNCH_LOG%
echo.
"%PS_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Sua-Loi.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
>>"%LAUNCH_LOG%" echo [%date% %time%] END exit=%EXIT_CODE%

:finish
echo.
if not "%EXIT_CODE%"=="0" (
  echo CAP NHAT THAT BAI (exit %EXIT_CODE%).
  echo Hay giu cua so nay va gui log neu can kiem tra.
) else (
  echo DA HOAN TAT CAP NHAT. Co the dong cua so nay.
)
echo.
pause
exit /b %EXIT_CODE%
