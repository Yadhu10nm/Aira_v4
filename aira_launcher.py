#!/usr/bin/env python3
"""
AIRA Launcher - Interactive startup script for Aira v4
Emotional Intelligence System developed by Yadhu Krishna
"""

import os
import sys
import subprocess
import time
import shutil
from pathlib import Path

# Enable ANSI colors in Windows Terminal
if sys.platform == 'win32':
    os.system('')  # Enable VT100 terminal sequences

# ANSI Color codes
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    WHITE = '\033[97m'
    GRAY = '\033[90m'
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if sys.platform == 'win32' else 'clear')

def print_banner():
    """Display AIRA ASCII banner"""
    banner = f"""
{Colors.CYAN}     _    ___ ____      _
    / \\  |_ _|  _ \\    / \\
   / _ \\  | || |_) |  / _ \\
  / ___ \\ | ||  _ <  / ___ \\
 /_/   \\_\\___|_| \\_\\/_/   \\_\\{Colors.RESET}

{Colors.YELLOW}    Emotional Intelligence System{Colors.RESET}
{Colors.GRAY}    ======================================{Colors.RESET}
{Colors.CYAN}    Developed by Yadhu Krishna{Colors.RESET}
{Colors.GRAY}    ======================================{Colors.RESET}
"""
    print(banner)

def check_command(command):
    """Check if a command exists"""
    return shutil.which(command) is not None

def get_version(command):
    """Get version of a command"""
    try:
        result = subprocess.run(
            [command, '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.stdout.strip().split('\n')[0]
    except:
        return "Unknown"

def check_dependencies():
    """Check if required dependencies are installed"""
    print(f"\n{Colors.YELLOW}[INFO]{Colors.RESET} Checking system dependencies...\n")

    all_good = True

    # Check Python
    if sys.version_info >= (3, 10):
        print(f"{Colors.GREEN}[OK]{Colors.RESET} Python {sys.version.split()[0]}")
    else:
        print(f"{Colors.RED}[FAIL]{Colors.RESET} Python 3.10+ required (found {sys.version.split()[0]})")
        all_good = False

    # Check Node.js
    if check_command('node'):
        version = get_version('node')
        print(f"{Colors.GREEN}[OK]{Colors.RESET} Node.js {version}")
    else:
        print(f"{Colors.RED}[FAIL]{Colors.RESET} Node.js not found")
        all_good = False

    # Check npm
    if check_command('npm'):
        version = get_version('npm')
        print(f"{Colors.GREEN}[OK]{Colors.RESET} npm {version}")
    else:
        print(f"{Colors.RED}[FAIL]{Colors.RESET} npm not found")
        all_good = False

    # Check virtual environment
    venv_path = Path('.venv/Scripts/python.exe' if sys.platform == 'win32' else '.venv/bin/python')
    if venv_path.exists():
        print(f"{Colors.GREEN}[OK]{Colors.RESET} Virtual environment detected")
    else:
        print(f"{Colors.YELLOW}[WARN]{Colors.RESET} Virtual environment not found")
        response = input(f"\n{Colors.CYAN}Create virtual environment now? [Y/n]:{Colors.RESET} ").strip().lower()
        if response in ['', 'y', 'yes']:
            print(f"{Colors.YELLOW}[INFO]{Colors.RESET} Creating virtual environment...")
            subprocess.run([sys.executable, '-m', 'venv', '.venv'])
            print(f"{Colors.GREEN}[OK]{Colors.RESET} Virtual environment created")
        else:
            all_good = False

    # Check frontend dependencies
    node_modules = Path('frontend/node_modules')
    if node_modules.exists():
        print(f"{Colors.GREEN}[OK]{Colors.RESET} Frontend dependencies installed")
    else:
        print(f"{Colors.YELLOW}[WARN]{Colors.RESET} Frontend dependencies not found")
        response = input(f"\n{Colors.CYAN}Install frontend dependencies now? [Y/n]:{Colors.RESET} ").strip().lower()
        if response in ['', 'y', 'yes']:
            print(f"{Colors.YELLOW}[INFO]{Colors.RESET} Installing frontend dependencies...")
            subprocess.run(['npm', 'install'], cwd='frontend')
            print(f"{Colors.GREEN}[OK]{Colors.RESET} Frontend dependencies installed")
        else:
            all_good = False

    print()
    return all_good

def show_menu():
    """Display interactive menu"""
    print(f"\n{Colors.CYAN}+=======================================+{Colors.RESET}")
    print(f"{Colors.CYAN}|{Colors.RESET}  {Colors.WHITE}{Colors.BOLD}AIRA Launcher - Select Option{Colors.RESET}      {Colors.CYAN}|{Colors.RESET}")
    print(f"{Colors.CYAN}+=======================================+{Colors.RESET}")
    print(f"{Colors.CYAN}|{Colors.RESET}  {Colors.GREEN}[1]{Colors.RESET} Start Full Stack (Recommended)  {Colors.CYAN}|{Colors.RESET}")
    print(f"{Colors.CYAN}|{Colors.RESET}  {Colors.GREEN}[2]{Colors.RESET} Start Backend Only               {Colors.CYAN}|{Colors.RESET}")
    print(f"{Colors.CYAN}|{Colors.RESET}  {Colors.GREEN}[3]{Colors.RESET} Start Frontend Only              {Colors.CYAN}|{Colors.RESET}")
    print(f"{Colors.CYAN}|{Colors.RESET}  {Colors.YELLOW}[4]{Colors.RESET} Run Diagnostics                  {Colors.CYAN}|{Colors.RESET}")
    print(f"{Colors.CYAN}|{Colors.RESET}  {Colors.RED}[5]{Colors.RESET} Exit                             {Colors.CYAN}|{Colors.RESET}")
    print(f"{Colors.CYAN}+=======================================+{Colors.RESET}\n")

def start_backend():
    """Start the FastAPI backend server"""
    clear_screen()
    print(f"\n{Colors.CYAN}========================================{Colors.RESET}")
    print(f"{Colors.GREEN}  Starting AIRA Backend Server...{Colors.RESET}")
    print(f"{Colors.CYAN}========================================{Colors.RESET}\n")

    print(f"{Colors.YELLOW}[INFO]{Colors.RESET} Activating virtual environment...")
    print(f"{Colors.GREEN}[OK]{Colors.RESET} Virtual environment activated")
    print(f"{Colors.YELLOW}[INFO]{Colors.RESET} Starting FastAPI on http://127.0.0.1:8000")
    print(f"{Colors.GRAY}[INFO]{Colors.RESET} Press CTRL+C to stop the server")
    print(f"{Colors.CYAN}========================================{Colors.RESET}\n")

    root_dir = Path.cwd()
    if sys.platform == 'win32':
        backend_script = root_dir / 'scripts' / 'start_backend.bat'
        subprocess.run([str(backend_script)])
    else:
        venv_python = root_dir / '.venv' / 'bin' / 'python'
        os.chdir('backend')
        subprocess.run([str(venv_python), '-m', 'uvicorn', 'server.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'])
        os.chdir('..')

def start_frontend():
    """Start the Vite frontend dev server"""
    clear_screen()
    print(f"\n{Colors.CYAN}========================================{Colors.RESET}")
    print(f"{Colors.GREEN}  Starting AIRA Frontend...{Colors.RESET}")
    print(f"{Colors.CYAN}========================================{Colors.RESET}\n")

    print(f"{Colors.YELLOW}[INFO]{Colors.RESET} Starting Vite development server...")
    print(f"{Colors.GREEN}[OK]{Colors.RESET} Frontend available at http://localhost:5173")
    print(f"{Colors.GRAY}[INFO]{Colors.RESET} Press CTRL+C to stop the server")
    print(f"{Colors.CYAN}========================================{Colors.RESET}\n")

    root_dir = Path.cwd()
    if sys.platform == 'win32':
        frontend_script = root_dir / 'scripts' / 'start_frontend.bat'
        subprocess.run([str(frontend_script)])
    else:
        os.chdir('frontend')
        subprocess.run(['npm', 'run', 'dev'])
        os.chdir('..')

def start_both():
    """Start both backend and frontend in separate windows"""
    clear_screen()
    print(f"\n{Colors.CYAN}========================================{Colors.RESET}")
    print(f"{Colors.GREEN}  Starting AIRA System (Full Stack){Colors.RESET}")
    print(f"{Colors.CYAN}========================================{Colors.RESET}\n")

    print(f"{Colors.YELLOW}[INFO]{Colors.RESET} Starting backend and frontend servers...")
    print(f"{Colors.YELLOW}[NOTE]{Colors.RESET} Two additional terminal windows will open:")
    print(f"{Colors.GRAY}        * Terminal 1 (Frontend):{Colors.RESET} http://localhost:5173")
    print(f"{Colors.GRAY}        * Terminal 2 (Backend):{Colors.RESET} http://127.0.0.1:8000")
    print(f"{Colors.GRAY}        * This terminal stays open for monitoring\n{Colors.RESET}")
    print(f"{Colors.GREEN}[OK]{Colors.RESET} Launching servers...")
    print(f"{Colors.CYAN}========================================{Colors.RESET}\n")

    # Get absolute paths
    root_dir = Path.cwd()
    venv_python = root_dir / '.venv' / 'Scripts' / 'python.exe' if sys.platform == 'win32' else root_dir / '.venv' / 'bin' / 'python'

    # Start frontend in new terminal FIRST
    if sys.platform == 'win32':
        # Frontend terminal - use batch script
        frontend_script = root_dir / 'scripts' / 'start_frontend.bat'
        subprocess.Popen(['cmd', '/c', 'start', 'cmd', '/k', str(frontend_script)])

        print(f"{Colors.CYAN}[1/2]{Colors.RESET} Frontend terminal launched (Cyan window)")
        time.sleep(2)  # Wait before starting backend

        # Backend terminal - use batch script
        backend_script = root_dir / 'scripts' / 'start_backend.bat'
        subprocess.Popen(['cmd', '/c', 'start', 'cmd', '/k', str(backend_script)])

        print(f"{Colors.GREEN}[2/2]{Colors.RESET} Backend terminal launched (Green window)")
    else:
        # Linux/Mac - use gnome-terminal or xterm
        # Frontend first
        subprocess.Popen(
            ['gnome-terminal', '--', 'bash', '-c', f'cd "{root_dir}/frontend" && npm run dev; exec bash'],
        )
        print(f"{Colors.CYAN}[1/2]{Colors.RESET} Frontend terminal launched")
        time.sleep(2)

        # Backend second
        subprocess.Popen(
            ['gnome-terminal', '--', 'bash', '-c', f'cd "{root_dir}/backend" && "{venv_python}" -m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000; exec bash'],
        )
        print(f"{Colors.GREEN}[2/2]{Colors.RESET} Backend terminal launched")

    print(f"\n{Colors.GREEN}========================================{Colors.RESET}")
    print(f"{Colors.GREEN}  All servers launched successfully!{Colors.RESET}")
    print(f"{Colors.GREEN}========================================{Colors.RESET}\n")

    print(f"{Colors.YELLOW}[TIP]{Colors.RESET} Total terminals: 3 (Main + Frontend + Backend)")
    print(f"{Colors.YELLOW}[TIP]{Colors.RESET} Open http://localhost:5173 in your browser")
    print(f"{Colors.YELLOW}[TIP]{Colors.RESET} Backend API docs: http://127.0.0.1:8000/docs")
    print(f"{Colors.YELLOW}[TIP]{Colors.RESET} Close servers with CTRL+C in each terminal\n")

    print(f"{Colors.CYAN}This main terminal will remain open for monitoring.{Colors.RESET}")
    print(f"{Colors.GRAY}You can minimize it or keep it visible for status updates.{Colors.RESET}\n")

    input(f"{Colors.WHITE}Press Enter to close this main launcher terminal...{Colors.RESET}")

def main():
    """Main launcher function"""
    clear_screen()
    print_banner()

    # Check dependencies first
    if not check_dependencies():
        print(f"\n{Colors.RED}[ERROR]{Colors.RESET} Please resolve dependency issues before continuing.")
        input(f"\n{Colors.GRAY}Press Enter to exit...{Colors.RESET}")
        sys.exit(1)

    while True:
        show_menu()
        choice = input(f"{Colors.WHITE}Enter your choice [1-5]:{Colors.RESET} ").strip()

        if choice == '1':
            start_both()
            break
        elif choice == '2':
            start_backend()
            break
        elif choice == '3':
            start_frontend()
            break
        elif choice == '4':
            clear_screen()
            print_banner()
            check_dependencies()
            input(f"\n{Colors.GRAY}Press Enter to return to menu...{Colors.RESET}")
            clear_screen()
            print_banner()
        elif choice == '5':
            print(f"\n{Colors.CYAN}========================================{Colors.RESET}")
            print(f"{Colors.YELLOW}  Thank you for using AIRA!{Colors.RESET}")
            print(f"{Colors.CYAN}========================================{Colors.RESET}\n")
            time.sleep(1)
            sys.exit(0)
        else:
            print(f"{Colors.RED}[ERROR]{Colors.RESET} Invalid choice! Please select 1-5.")
            time.sleep(1.5)
            clear_screen()
            print_banner()
            check_dependencies()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}[INFO]{Colors.RESET} Launcher interrupted by user.")
        print(f"{Colors.CYAN}========================================{Colors.RESET}")
        print(f"{Colors.YELLOW}  Goodbye!{Colors.RESET}")
        print(f"{Colors.CYAN}========================================{Colors.RESET}\n")
        sys.exit(0)
