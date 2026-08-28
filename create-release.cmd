@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-release.ps1"
if not errorlevel 1 exit /b 0
set "exitCode=%errorlevel%"
pause
exit /b %exitCode%
