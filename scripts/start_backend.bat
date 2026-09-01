@echo off
title AIRA Backend Server
color 0A
cd /d "%~dp0..\backend"
echo.
echo ===================================================
echo   AIRA Backend Server (FastAPI + Uvicorn)
echo   Local: http://127.0.0.1:8000
echo   Docs:  http://127.0.0.1:8000/docs
echo ===================================================
echo.
if exist "..\.venv\Scripts\python.exe" (
    "..\.venv\Scripts\python.exe" -m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
) else (
    python -m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend server encountered an error.
    pause
)
