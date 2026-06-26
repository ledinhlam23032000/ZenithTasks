@echo off
title Tham My Hong Phuc
setlocal enabledelayedexpansion
set "CFG=%~dp0diachi.txt"
if exist "%CFG%" goto RUN
echo ==============================================
echo     THAM MY HONG PHUC - Ung dung may con
echo ==============================================
echo Lan dau chay: dan DIA CHI MAY CHU roi Enter.
echo   - Cung mang noi bo:  http://192.168.1.20:3000
echo   - Qua Internet:      https://vidu.trycloudflare.com
echo.
set /p ADDR=Dia chi may chu: 
>"%CFG%" echo !ADDR!
:RUN
set /p URL=<"%CFG%"
echo Dang mo ung dung: !URL!
start "" msedge --app=!URL!
