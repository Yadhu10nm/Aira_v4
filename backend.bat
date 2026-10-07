@echo off
setlocal
title AIRA v4 - Backend
echo ========================================================
echo      Starting AIRA Backend (FastAPI - Gemma 3 4B LoRA)
echo ========================================================
echo.

cd /d "%~dp0"

if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment .venv ...
    call "%~dp0.venv\Scripts\activate.bat"
) else if exist "C:\aira_dataset\.venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment C:\aira_dataset\.venv ...
    call "C:\aira_dataset\.venv\Scripts\activate.bat"
) else (
    echo [WARNING] Virtual environment not found. Using system Python ...
)

cd /d "%~dp0backend"

echo [INFO] Starting FastAPI server on http://127.0.0.1:8000 ...
echo [INFO] Swagger Docs: http://127.0.0.1:8000/docs
echo.

python -m uvicorn server.main:app --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo [ERROR] Backend server stopped with an error.
    pause
)
