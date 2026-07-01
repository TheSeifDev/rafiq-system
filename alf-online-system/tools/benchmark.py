import subprocess
import time
import psutil
import json
import sys
import threading

def main():
    print("Starting BEFORE benchmark...")
    
    with open("benchmark_run.log", "w", encoding="utf-8") as log_file:
        process = subprocess.Popen(
            [sys.executable, "rafiq_launcher.py"],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            cwd="c:/Users/aboha/Desktop/rafiq-system"
        )
        
        cpu_samples = []
        ram_samples = []
        
        try:
            # Let it run for 45 seconds to complete full startup
            for _ in range(450):
                if process.poll() is not None:
                    break
                try:
                    proc = psutil.Process(process.pid)
                    total_cpu = proc.cpu_percent(interval=None)
                    total_ram = proc.memory_info().rss
                    for child in proc.children(recursive=True):
                        try:
                            total_cpu += child.cpu_percent(interval=None)
                            total_ram += child.memory_info().rss
                        except:
                            pass
                    cpu_samples.append(total_cpu)
                    ram_samples.append(total_ram)
                except:
                    pass
                time.sleep(0.1)
                
        except Exception as e:
            print("Error:", e)
        finally:
            try:
                parent = psutil.Process(process.pid)
                for child in parent.children(recursive=True):
                    child.kill()
                parent.kill()
            except:
                pass
                
        metrics = {
            "cpu_usage_avg": sum(cpu_samples) / len(cpu_samples) if cpu_samples else 0,
            "cpu_usage_max": max(cpu_samples) if cpu_samples else 0,
            "ram_usage_mb": max(ram_samples) / (1024 * 1024) if ram_samples else 0,
        }
            
        print(f"Metrics Collected: CPU Max {metrics['cpu_usage_max']:.2f}%, RAM Max {metrics['ram_usage_mb']:.2f}MB")
        with open("before_benchmark.json", "w") as f:
            json.dump(metrics, f)

if __name__ == "__main__":
    main()
