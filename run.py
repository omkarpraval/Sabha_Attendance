import subprocess
import time
import sys
import os

def start_app():
    print("==================================================")
    print(" Starting Sabha Attendance Management System ")
    print("==================================================")

    # 1. Start Backend FastAPI Server
    print("[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=os.path.join(os.path.dirname(__file__), "backend")
    )

    time.sleep(2)

    # 2. Start Frontend Vite Server
    print("[2/2] Starting Vite Frontend on http://localhost:5173 ...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(os.path.dirname(__file__), "frontend"),
        shell=True
    )

    print("\n--------------------------------------------------")
    print(" Both servers are live!")
    print(" Open http://localhost:5173 in your browser.")
    print(" Press Ctrl+C to terminate.")
    print("--------------------------------------------------\n")

    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nStopping processes...")
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    start_app()
