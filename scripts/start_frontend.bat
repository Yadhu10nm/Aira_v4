@echo off
title AIRA Frontend Dev Server
color 0B
cd /d "%~dp0..\frontend"
echo.
echo ===================================================
echo   AIRA Frontend Development Server (Vite)
echo   Local: http://localhost:5173
echo ===================================================
echo.
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend server encountered an error.
    pause
)
