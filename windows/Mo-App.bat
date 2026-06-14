@echo off
title Zenith Clinic
echo Dang khoi dong may chu va mo ung dung Zenith Clinic...
cd /d "%USERPROFILE%\ZenithTasks"
docker compose up -d
start "" msedge --app=http://localhost:3000
