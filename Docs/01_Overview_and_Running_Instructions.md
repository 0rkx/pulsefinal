# PulseIQ - Project Overview & Running Instructions

PulseIQ is an advanced full-stack application designed to detect, track, and mitigate employee burnout using a suite of statistical, behavioral, and machine learning models. 

## High-Level Architecture
1. **Machine Learning Pipeline (Python)**: Generates or processes synthetic workspace data across text, meetings, and code repos to derive a cohesive, ensemble-driven Burnout Probability per employee.
2. **Backend API (FastAPI)**: Serves the resulting metrics, time-series projections, ML predictions, and AI-driven narratives to the client.
3. **Frontend Dashboard (React/Vite)**: Gives employees and managers detailed insights, alerts, and actionable recommendations.

## How to Run the Program

The application is bundled into a unified launcher `run.py` at the project root which coordinates the ML processing and both web environments simultaneously.

### Prerequisites
Before running, ensure you have:
- Python 3.9+
- Node.js (v16+)
- Dependencies installed:
  ```bash
  pip install -r backend/requirements.txt
  npm install
  ```

### General Startup
To run the full suite (regenerate all ML data, start API, start React):
```bash
python run.py
```

### Advanced Modes
`run.py` supports several configurations depending on your needs. Check out the following flags:

- `python run.py --skip-pipeline`: Skips the ML pipeline, just starts the FastAPI and Vite servers. Use this when your `pulseiq_data/` folder is already up to date.
- `python run.py --skip-ml`: Runs the standard behavioral pipeline without the advanced ML models (LSTM, time-series, anomalies). Faster!
- `python run.py --api-only`: Starts only the FastAPI server (runs on `http://localhost:8000`).
- `python run.py --frontend-only`: Starts only the Vite UI server (runs on `http://localhost:5173`).

### What Happens During `python run.py`?
1. The script first runs `backend/main.py`. This orchestrates 10 sequential pipeline steps (data generation -> feature building -> model training -> scoring -> ensemble generation -> final reporting). Data artifacts are generated in `pulseiq_data/`.
2. Upon successful pipeline generation, the system daemonizes an API server (`uvicorn`) and a dev frontend server (`npm run dev`).
3. Pressing `Ctrl+C` cleanly tears down the application using automated PID trapping.

See the other documentation files in this directory for granular details on every single step.
