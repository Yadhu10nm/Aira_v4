# AIRA Launcher - Quick Start Guide

## Overview

The AIRA launcher automatically starts both frontend and backend servers with a beautiful ASCII art interface and color-coded terminals.

## Usage

Simply double-click or run:

```bash
start_aira.bat
```

That's it! No menu, no options - just instant full-stack launch.

## What Happens

1. **Displays ASCII Banner** - "AIRA - Emotional Intelligence System"
2. **Checks Dependencies** - Python, Node.js, virtual environment, npm packages
3. **Auto-Setup** - Creates venv and installs dependencies if missing
4. **Launches 3 Terminals:**
   - **Main Terminal** (Cyan) - Status and monitoring, stays open
   - **Frontend Terminal** (Cyan) - Vite dev server at http://localhost:5173
   - **Backend Terminal** (Green) - FastAPI server at http://127.0.0.1:8000

## Terminal Colors

- 🔵 **Main Terminal**: Cyan - Shows startup status and tips
- 🔵 **Frontend Terminal**: Cyan/Blue - Vite development server
- 🟢 **Backend Terminal**: Green - FastAPI/Uvicorn server

## Requirements

- Python 3.10+
- Node.js and npm
- Windows 10/11 with Command Prompt or Windows Terminal

## Access Points

- **Frontend App**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs

## Stopping Servers

Press `CTRL+C` in each terminal window to stop the respective server.

## File Structure

```
Aira_v4/
├── start_aira.bat          # Main launcher (double-click this)
├── aira_launcher.py        # Python launcher (alternative)
└── scripts/
    ├── start_frontend.bat  # Frontend launcher script
    └── start_backend.bat   # Backend launcher script
```

## Troubleshooting

**No color output?**
- Use Windows Terminal instead of old Command Prompt
- Colors are automatically enabled for Windows 10+

**Virtual environment not created?**
- The launcher creates it automatically
- Manually: `python -m venv .venv`

**Dependencies not installing?**
- Check internet connection
- Manually: `cd frontend && npm install`

**Ports already in use?**
- Close other apps using ports 5173 and 8000
- Or modify ports in the batch scripts

## Development

**Developed by Yadhu Krishna**

AIRA v4 - Emotional Intelligence System
