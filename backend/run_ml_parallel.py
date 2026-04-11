"""
run_ml_parallel.py

Executes Time Series Analysis, Anomaly Detection, and LSTM model training
simultaneously using multiprocessing to dramatically speed up the pipeline.
"""
import multiprocessing
import time
import sys

def run_task(name, module_name):
    print(f"    [ {name} ] Starting model training...")
    t0 = time.time()
    try:
        import importlib
        mod = importlib.import_module(module_name)
        # Suppress heavy output individually so it doesn't clutter console
        # Though the models print natively, we can let them interleave if we want, or suppress stdout
        
        # We'll let them print; on Windows multiprocessing spawn interleaves natively.
        mod.main()
        
        print(f"    [ {name} ] Completed successfully! ({time.time()-t0:.1f}s)")
    except Exception as e:
        print(f"    [ {name} ] FAILED: {e}")

def main():
    tasks = [
        ("Time-Series (ARIMA)", "time_series_analysis"),
        ("Anomaly (Isolation Forest)", "anomaly_detection"),
        ("Deep Learning (PyTorch LSTM)", "deep_learning_model")
    ]
    
    print("\n  Launching Models in Parallel...")
    processes = []
    for name, module in tasks:
        p = multiprocessing.Process(target=run_task, args=(name, module))
        processes.append(p)
        p.start()
        
    for p in processes:
        p.join()
        
    print("  All Parallel ML models finished.")

if __name__ == "__main__":
    main()
