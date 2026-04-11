"""
PulseIQ — Unified Launcher
============================
Runs EVERYTHING at once:
  1. ML Pipeline  (python main.py — generates all data + trains models)
  2. Backend API  (uvicorn api:app — FastAPI on port 8000)
  3. Frontend     (npm run dev — Vite on port 5173)

Usage:
  python run.py              # full run: pipeline → API + frontend
  python run.py --skip-pipeline   # skip ML pipeline, just start servers
  python run.py --skip-ml         # run pipeline without advanced ML, then start servers
  python run.py --api-only        # only start the API server
  python run.py --frontend-only   # only start the frontend

Press Ctrl+C to stop everything.
"""

import argparse
import os
import signal
import subprocess
import sys
import threading
import time

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ROOT_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
API_PORT    = 8000
FRONTEND_PORT = 5173

# ANSI colors
BOLD   = "\033[1m"
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
MAGENTA= "\033[35m"
RESET  = "\033[0m"

# Track child processes for clean shutdown
_processes = []

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _banner():
    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████╗ ██╗   ██╗██╗     ███████╗███████╗██╗ ██████╗       ║
║   ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝██║██╔═══██╗      ║
║   ██████╔╝██║   ██║██║     ███████╗█████╗  ██║██║   ██║      ║
║   ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  ██║██║▄▄ ██║      ║
║   ██║     ╚██████╔╝███████╗███████║███████╗██║╚██████╔╝      ║
║   ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝╚═╝ ╚══▀▀═╝       ║
║                                                              ║
║          Burnout Detection Intelligence Platform             ║
║                    V5.0 — Full ML Suite                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{RESET}
""")

def _hr(char="─", width=60):
    print(f"  {char * width}")

def _log(tag, color, msg):
    timestamp = time.strftime("%H:%M:%S")
    print(f"  {color}[{tag:>10s}]{RESET} {timestamp}  {msg}")

def _stream_output(proc, tag, color):
    """Stream subprocess output line-by-line with colored tags."""
    try:
        for line in iter(proc.stdout.readline, ""):
            if line.strip():
                _log(tag, color, line.strip())
    except (ValueError, OSError):
        pass  # Process closed

def _start_process(cmd, cwd, tag, color, env=None):
    """Start a subprocess and stream its output in a background thread."""
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=merged_env,
        shell=True,
    )
    _processes.append(proc)

    thread = threading.Thread(
        target=_stream_output,
        args=(proc, tag, color),
        daemon=True,
    )
    thread.start()

    return proc

def _cleanup(*args):
    """Kill all child processes on exit."""
    print(f"\n\n  {YELLOW}Shutting down...{RESET}")
    for proc in _processes:
        try:
            proc.terminate()
        except OSError:
            pass
    # Wait briefly for processes to die
    for proc in _processes:
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
    print(f"  {GREEN}All processes stopped.{RESET}\n")
    sys.exit(0)

# ---------------------------------------------------------------------------
# Pipeline Runner
# ---------------------------------------------------------------------------
def run_pipeline(skip_ml=False):
    """Run the ML pipeline synchronously (must complete before servers start)."""
    _log("PIPELINE", MAGENTA, "Starting ML pipeline...")
    _hr("·")

    cmd = [sys.executable, "main.py"]
    if skip_ml:
        cmd.append("--skip-ml")

    proc = subprocess.run(
        cmd,
        cwd=BACKEND_DIR,
        text=True,
    )

    if proc.returncode != 0:
        _log("PIPELINE", RED, f"Pipeline failed with exit code {proc.returncode}")
        _log("PIPELINE", YELLOW, "Starting servers anyway (using existing data if available)...")
    else:
        _log("PIPELINE", GREEN, "Pipeline complete ✓")

    _hr("·")

# ---------------------------------------------------------------------------
# Server Starters
# ---------------------------------------------------------------------------
def start_api():
    """Start the FastAPI backend server."""
    _log("API", CYAN, f"Starting FastAPI on http://localhost:{API_PORT}")
    cmd = f"{sys.executable} -m uvicorn api:app --reload --host 0.0.0.0 --port {API_PORT}"
    return _start_process(cmd, BACKEND_DIR, "API", CYAN)

def start_frontend():
    """Start the Vite frontend dev server."""
    _log("FRONTEND", GREEN, f"Starting Vite on http://localhost:{FRONTEND_PORT}")
    cmd = "npm run dev"
    return _start_process(cmd, ROOT_DIR, "FRONTEND", GREEN)

# ---------------------------------------------------------------------------
# Dependency Check
# ---------------------------------------------------------------------------
def check_dependencies():
    """Quick sanity check for critical dependencies."""
    checks = []

    # Check Python deps
    try:
        import fastapi
        checks.append(("FastAPI", True))
    except ImportError:
        checks.append(("FastAPI", False))

    try:
        import pandas
        checks.append(("Pandas", True))
    except ImportError:
        checks.append(("Pandas", False))

    try:
        import numpy
        checks.append(("NumPy", True))
    except ImportError:
        checks.append(("NumPy", False))

    # Optional ML deps
    try:
        import transformers
        checks.append(("Transformers (HF)", True))
    except ImportError:
        checks.append(("Transformers (HF)", False))

    try:
        import tensorflow
        checks.append(("TensorFlow", True))
    except ImportError:
        checks.append(("TensorFlow", False))

    try:
        import sklearn
        checks.append(("scikit-learn", True))
    except ImportError:
        checks.append(("scikit-learn", False))

    try:
        import statsmodels
        checks.append(("statsmodels", True))
    except ImportError:
        checks.append(("statsmodels", False))

    # Check node_modules
    node_modules = os.path.join(ROOT_DIR, "node_modules")
    checks.append(("node_modules", os.path.isdir(node_modules)))

    # Print results
    _log("DEPS", YELLOW, "Dependency check:")
    all_ok = True
    for name, ok in checks:
        icon = f"{GREEN}✓{RESET}" if ok else f"{RED}✗{RESET}"
        print(f"             {icon}  {name}")
        if not ok and name in ("FastAPI", "Pandas", "NumPy", "node_modules"):
            all_ok = False

    if not all_ok:
        _log("DEPS", RED, "Missing REQUIRED dependencies!")
        _log("DEPS", YELLOW, "Run: pip install -r backend/requirements.txt")
        _log("DEPS", YELLOW, "Run: npm install")
        return False

    missing_ml = [n for n, ok in checks if not ok and n not in ("FastAPI", "Pandas", "NumPy", "node_modules")]
    if missing_ml:
        _log("DEPS", YELLOW, f"Optional ML deps missing: {', '.join(missing_ml)}")
        _log("DEPS", YELLOW, "Pipeline will run with fallbacks. Install with:")
        _log("DEPS", YELLOW, "  pip install -r backend/requirements.txt")

    return True

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="PulseIQ — Run everything at once"
    )
    parser.add_argument("--skip-pipeline", action="store_true",
                        help="Skip ML pipeline, just start servers")
    parser.add_argument("--skip-ml", action="store_true",
                        help="Run pipeline without advanced ML (faster)")
    parser.add_argument("--api-only", action="store_true",
                        help="Only start the backend API")
    parser.add_argument("--frontend-only", action="store_true",
                        help="Only start the frontend dev server")
    parser.add_argument("--no-check", action="store_true",
                        help="Skip dependency check")
    args = parser.parse_args()

    _banner()

    # Register cleanup handler
    signal.signal(signal.SIGINT, _cleanup)
    signal.signal(signal.SIGTERM, _cleanup)

    # Dependency check
    if not args.no_check:
        if not check_dependencies():
            print(f"\n  {RED}Fix missing dependencies before running.{RESET}\n")
            sys.exit(1)
        print()

    # Step 1: Run ML pipeline (unless skipped)
    if not args.skip_pipeline and not args.api_only and not args.frontend_only:
        run_pipeline(skip_ml=args.skip_ml)
        print()

    # Step 2: Start servers
    if args.api_only:
        _log("LAUNCH", BOLD, "Starting API server only...")
        start_api()
    elif args.frontend_only:
        _log("LAUNCH", BOLD, "Starting frontend only...")
        start_frontend()
    else:
        _log("LAUNCH", BOLD, "Starting both servers...")
        print()
        api_proc = start_api()
        time.sleep(1)  # Brief delay so API port binds first
        fe_proc = start_frontend()

    # Print access info
    print()
    _hr("═")
    print(f"""
  {BOLD}{GREEN}🚀 PulseIQ is running!{RESET}

  {BOLD}Frontend:{RESET}   {CYAN}http://localhost:{FRONTEND_PORT}{RESET}
  {BOLD}API:{RESET}        {CYAN}http://localhost:{API_PORT}{RESET}
  {BOLD}API Docs:{RESET}   {CYAN}http://localhost:{API_PORT}/docs{RESET}
  {BOLD}Health:{RESET}     {CYAN}http://localhost:{API_PORT}/api/health{RESET}
""")
    _hr("═")
    print(f"\n  Press {BOLD}Ctrl+C{RESET} to stop everything.\n")

    # Keep main thread alive
    try:
        while True:
            # Check if any critical process died
            for proc in _processes:
                if proc.poll() is not None:
                    _log("MONITOR", YELLOW, f"Process exited with code {proc.returncode}")
            time.sleep(2)
    except KeyboardInterrupt:
        _cleanup()


if __name__ == "__main__":
    main()
