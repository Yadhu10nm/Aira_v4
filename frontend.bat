@echo off
setlocal
title AIRA v4 - Frontend
echo ========================================================
echo               Starting AIRA Frontend (Vite)
echo ========================================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules\" (
    echo [INFO] node_modules not found. Running npm install ...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [INFO] Launching Vite development server ...
echo.
call npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Frontend server terminated with an error.
    pause
)
