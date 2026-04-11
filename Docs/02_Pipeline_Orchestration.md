# Pipeline Orchestration (`main.py`)

The ML pipeline is contained within `backend/main.py` which sequences together discrete logic chunks.

## The Steps
`main.py` registers an execution framework structured as an array of dictionaries (the `STEPS` array). It dynamically imports and invokes each module's `main()` function, gracefully catching errors.

The deterministic execution sequence is:
1. `generate_data.py`: Constructs the synthetic ground-truth ecosystem.
2. `aggregate_features.py`: Groups metrics by `(employee, date)` pairs for ML compatibility.
3. `compute_baselines.py`: Derives rolling personal benchmarks (what does "normal" mean for *this* employee).
4. `compute_burnout.py`: The behavioral mathematical engine evaluating rest decay and cognitive overload.
5. `recommendations.py`: Assigns tailored health guidance and alerts managers.
6. `manager_insights.py`: Pre-aggregates rollups for team-scale charting.
7. `run_ml_parallel.py`: Kicks off the parallel deep learning jobs (Time-Series ARIMA, Isolation Forests anomalous drops, PyTorch/TensorFlow LSTMs).
8. `predictive_ensemble.py`: Weighs all inputs to form an ultimate confidence-rated diagnosis.
9. `generate_report.py`: Builds a cohesive terminal summary of the riskiest individuals.

## Logging and Metrics
Each step logs its status, execution elapsed time, and output object scale. If a core process fails, `main.py` gracefully terminates the pipeline. If an *advanced* ML subprocess fails (such as an LSTM batch taking too much VRAM), the orchestrator yields a warning but permits the pipeline to operate smoothly onto the Predictive Ensemble.
