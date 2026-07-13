@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-folder.ps1"
if errorlevel 1 pause
