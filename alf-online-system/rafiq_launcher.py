import os
import sys
import time
import socket
import subprocess
import threading
import signal
import contextlib

# Ensure BASE_DIR is root directory
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

def check_port(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def log_reader(pipe, prefix, log_file):
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            for line in iter(pipe.readline, ''):
                clean_line = f"[{prefix}] {line}"
                # Print to console
                sys.stdout.write(clean_line)
                sys.stdout.flush()
                # Write to file
                f.write(clean_line)
                f.flush()
    except Exception as e:
        sys.stderr.write(f"[Launcher LogReader Error] {prefix}: {e}\n")
        sys.stderr.flush()

def kill_process_tree(proc):
    if not proc:
        return
    pid = proc.pid
    print(f"[Launcher] Terminating process tree for PID {pid}...")
    if sys.platform == "win32":
        try:
            # /f forces kill, /t terminates the process and any child processes started by it
            subprocess.run(["taskkill", "/f", "/t", "/pid", str(pid)], capture_output=True)
        except Exception as e:
            print(f"[Launcher] taskkill failed for PID {pid}: {e}")
    else:
        try:
            import os
            import signal
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                with contextlib.suppress(Exception):
                    proc.kill()

class RafiqLauncher:
    def __init__(self):
        self.backend = None
        self.listener = None
        self.gui = None
        self.shutting_down = False
        
        self.backend_restart_count = 0
        self.listener_restart_count = 0
        self.max_restarts = 5
        self.last_backend_launch = time.time()
        self.last_listener_launch = time.time()
        
        os.makedirs(os.path.join(ROOT_DIR, "logs"), exist_ok=True)
        
        self.backend_log = os.path.join(ROOT_DIR, "logs", "gui_bridge.log")
        self.listener_log = os.path.join(ROOT_DIR, "logs", "voice_listener.log")
        self.gui_log = os.path.join(ROOT_DIR, "logs", "gui.log")

    def start_backend(self):
        if self.shutting_down:
            return
        print(f"\n[Launcher] Starting Rafiq Backend Server...")
        self.last_backend_launch = time.time()
        self.backend = subprocess.Popen(
            [sys.executable, "-m", "src.gui_bridge"],
            cwd=ROOT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        threading.Thread(target=log_reader, args=(self.backend.stdout, "Backend", self.backend_log), daemon=True).start()
        threading.Thread(target=log_reader, args=(self.backend.stderr, "Backend-Err", self.backend_log), daemon=True).start()

    def start_listener(self):
        if self.shutting_down:
            return
        print(f"[Launcher] Starting Rafiq Voice Listener...")
        self.last_listener_launch = time.time()
        self.listener = subprocess.Popen(
            [sys.executable, "-m", "src.services.voice_listener"],
            cwd=ROOT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        threading.Thread(target=log_reader, args=(self.listener.stdout, "Listener", self.listener_log), daemon=True).start()
        threading.Thread(target=log_reader, args=(self.listener.stderr, "Listener-Err", self.listener_log), daemon=True).start()

    def start_gui(self):
        if self.shutting_down:
            return
        print(f"[Launcher] Launching Electron GUI...")
        gui_path = os.path.join(ROOT_DIR, "rafiq-gui", "rafiq-gui")
        
        self.gui = subprocess.Popen(
            ["cmd.exe", "/c", "npm", "run", "start"],
            cwd=gui_path,
            shell=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        threading.Thread(target=log_reader, args=(self.gui.stdout, "GUI", self.gui_log), daemon=True).start()
        threading.Thread(target=log_reader, args=(self.gui.stderr, "GUI-Err", self.gui_log), daemon=True).start()

    def shutdown(self):
        if self.shutting_down:
            return
        self.shutting_down = True
        print("\n[Launcher] Initiating clean shutdown of all processes...")
        
        # Terminate Electron GUI
        if self.gui:
            print("[Launcher] Terminating Electron GUI...")
            kill_process_tree(self.gui)
                
        # Terminate Voice Listener
        if self.listener:
            print("[Launcher] Terminating Voice Listener...")
            kill_process_tree(self.listener)
                
        # Terminate Backend Bridge
        if self.backend:
            print("[Launcher] Terminating Backend Bridge...")
            kill_process_tree(self.backend)
                
        print("[Launcher] Shutdown complete. Goodbye!")
        sys.exit(0)

    def run(self):
        # Setup signal traps
        signal.signal(signal.SIGINT, lambda sig, frame: self.shutdown())
        signal.signal(signal.SIGTERM, lambda sig, frame: self.shutdown())
        
        # 1. Start Backend
        self.start_backend()
        
        # 2. Wait for Backend port 3002 to be active
        print("[Launcher] Waiting for Backend server to bind to port 3002...")
        attempts = 0
        while not check_port(3002) and attempts < 30:
            if self.backend.poll() is not None:
                print("[Launcher] Error: Backend crashed during startup.")
                self.shutdown()
                return
            time.sleep(0.5)
            attempts += 1
            
        if not check_port(3002):
            print("[Launcher] Error: Backend failed to respond on port 3002 within 15 seconds.")
            self.shutdown()
            return
        print("[Launcher] Backend server is online.")
        
        # 3. Start Voice Listener
        self.start_listener()
        
        # 4. Wait for both ports to be fully ready
        time.sleep(1.0)
        
        # 5. Start GUI
        self.start_gui()
        
        # 6. Supervision loop
        print("[Launcher] System is online and supervised. Press Ctrl+C to stop.")
        while not self.shutting_down:
            try:
                time.sleep(2.0)
                
                # Check GUI status
                if self.gui and self.gui.poll() is not None:
                    print("[Launcher] Electron GUI closed by user.")
                    self.shutdown()
                    return
                    
                now = time.time()
                
                # Check Backend status
                if self.backend and self.backend.poll() is not None:
                    if not self.shutting_down:
                        print(f"[Launcher] WARNING: Backend crashed (Exit code: {self.backend.returncode})!")
                        if self.backend_restart_count < self.max_restarts:
                            self.backend_restart_count += 1
                            print(f"[Launcher] Restarting Backend (Attempt {self.backend_restart_count}/{self.max_restarts})...")
                            self.start_backend()
                        else:
                            print("[Launcher] Maximum Backend restarts reached. Shutting down...")
                            self.shutdown()
                            return
                else:
                    # Reset backend restart count if running cleanly for 60+ seconds
                    if self.backend and now - self.last_backend_launch > 60.0 and self.backend_restart_count > 0:
                        print("[Launcher] Backend has been stable. Resetting backend restart count.")
                        self.backend_restart_count = 0
                            
                # Check Listener status
                if self.listener and self.listener.poll() is not None:
                    if not self.shutting_down:
                        print(f"[Launcher] WARNING: Voice Listener crashed (Exit code: {self.listener.returncode})!")
                        if self.listener_restart_count < self.max_restarts:
                            self.listener_restart_count += 1
                            print(f"[Launcher] Restarting Voice Listener (Attempt {self.listener_restart_count}/{self.max_restarts})...")
                            self.start_listener()
                        else:
                            print("[Launcher] Maximum Voice Listener restarts reached. Shutting down...")
                            self.shutdown()
                            return
                else:
                    # Reset listener restart count if running cleanly for 60+ seconds
                    if self.listener and now - self.last_listener_launch > 60.0 and self.listener_restart_count > 0:
                        print("[Launcher] Voice Listener has been stable. Resetting listener restart count.")
                        self.listener_restart_count = 0
                            
            except Exception as e:
                print(f"[Launcher] Error in supervision loop: {e}")

if __name__ == "__main__":
    launcher = RafiqLauncher()
    launcher.run()
