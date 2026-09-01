@echo off
setlocal EnableDelayedExpansion

:: Set console colors and title
color 0B
title AIRA - Emotional Intelligence System

:: Clear screen
cls

:: Display ASCII Art Banner
echo.
echo [96m     _    ___ ____      _[0m
echo [96m    / \  ^|_ _^|  _ \    / \[0m
echo [96m   / _ \  ^| ^|^| ^|_^) ^|  / _ \[0m
echo [96m  / ___ \ ^| ^|^|  _ ^<  / ___ \[0m
echo [96m /_/   \_\___^|_^| \_\/_/   \_\[0m
echo.
echo [93m    Emotional Intelligence System[0m
echo [90m    ======================================[0m
echo [96m    Developed by Yadhu Krishna[0m
echo [90m    ======================================[0m
echo.
echo.

:: Check if Python is installed
echo [33m[INFO][0m Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [91m[ERROR][0m Python is not installed or not in PATH!
    echo [93m[HINT][0m Please install Python 3.10+ and try again.
    pause
    exit /b 1
)
echo [92m[OK][0m Python found
echo.

:: Check if Node.js is installed
echo [33m[INFO][0m Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [91m[ERROR][0m Node.js is not installed or not in PATH!
    echo [93m[HINT][0m Please install Node.js and try again.
    pause
    exit /b 1
)
echo [92m[OK][0m Node.js found
echo.

:: Check if virtual environment exists
if not exist ".venv\Scripts\python.exe" (
    echo [93m[WARNING][0m Virtual environment not found!
    echo [33m[INFO][0m Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [91m[ERROR][0m Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo [92m[OK][0m Virtual environment created.
    echo.
)

:: Check if frontend dependencies are installed
if not exist "frontend\node_modules\" (
    echo [93m[WARNING][0m Frontend dependencies not found!
    echo [33m[INFO][0m Installing frontend dependencies...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo [91m[ERROR][0m Failed to install frontend dependencies!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [92m[OK][0m Frontend dependencies installed.
    echo.
)

:: Start Full Stack
echo.
echo [96m========================================[0m
echo [92m  Starting AIRA System (Full Stack)[0m
echo [96m========================================[0m
echo.
echo [33m[INFO][0m Starting backend and frontend servers...
echo [93m[NOTE][0m Two additional terminal windows will open:
echo [90m        * Terminal 1 (Frontend):[0m http://localhost:5173
echo [90m        * Terminal 2 (Backend):[0m http://127.0.0.1:8000
echo [90m        * This terminal stays open for monitoring[0m
echo.
echo [92m[OK][0m Launching servers...
echo [96m========================================[0m
echo.

:: Start frontend in new terminal
start "AIRA Frontend Dev Server" cmd /k "color 0B && cd /d "%~dp0scripts" && start_frontend.bat"

echo [96m[1/2][0m Frontend terminal launched (Cyan window)

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start backend in new terminal
start "AIRA Backend Server" cmd /k "color 0A && cd /d "%~dp0scripts" && start_backend.bat"

echo [92m[2/2][0m Backend terminal launched (Green window)

echo.
echo [92m========================================[0m
echo [92m  All servers launched successfully![0m
echo [92m========================================[0m
echo.
echo [93m[TIP][0m Total terminals: 3 (Main + Frontend + Backend)
echo [93m[TIP][0m Open http://localhost:5173 in your browser
echo [93m[TIP][0m Backend API docs: http://127.0.0.1:8000/docs
echo [93m[TIP][0m Close servers with CTRL+C in each terminal
echo.
echo [96mThis main terminal will remain open for monitoring.[0m
echo [90mYou can minimize it or keep it visible for status updates.[0m
echo.
echo [97mPress any key to close this main launcher terminal...[0m
pause >nul

exit /b 0
