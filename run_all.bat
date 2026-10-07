@echo off
title AIRA v4 - Launcher
echo ========================================================
echo         Launching AIRA v4 (Backend & Frontend)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching Backend in a separate window...
start "AIRA Backend" cmd /c "%~dp0backend.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend in a separate window...
start "AIRA Frontend" cmd /c "%~dp0frontend.bat"

echo.
echo Both services are now running in their own windows!
echo Keep those windows open while using AIRA.
echo.
