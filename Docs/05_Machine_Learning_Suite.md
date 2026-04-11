# Machine Learning Suite

The PulseIQ backend supplements the core behavioral engine with advanced time-series analysis and Neural Networks. The execution is coordinated by `run_ml_parallel.py` which delegates individual modeling routines.

## Time-Series Analysis (`time_series_analysis.py`)
Treats the trailing probabilities of burnout as a sequential mathematical wave.
- **EWMA (Exponentially Weighted Moving Average)** highlights the macro-signal over the noise.
- Generates forecasting by identifying the underlying behavioral distribution curve.
- Outputs `rolling_volatility` metrics (signifying erratic schedules or unstable work-life borders) and `trend_direction` ("rising_fast", "stable", etc).
- Generates `timeseries_forecasts.csv`.

## Anomaly Detection (`anomaly_detection.py`)
Utilizes Scikit-Learn's `IsolationForest` to monitor multidimensional anomalies across dozens of variables simultaneously.
- While the behavioral engine checks against an absolute scale, the Isolation Forest maps employees dimensionally. It tags an event anomalous if they deviate substantially from their localized clusters (e.g. they suddenly drop off Jira, shift code commitments rapidly, and withdraw from DMs overnight).
- Outputs `anomaly_scores.csv` tagging exact outlier behaviors.

## Deep Learning Prediction (`deep_learning_model.py`)
Deploys Long Short-Term Memory Networks (LSTMs) built using TensorFlow/PyTorch architectures.
- LSTMs inherently retain internal cell state over multiple observations (the "trailing sequence barrier"). 
- Takes sequences of trailing 14-30 day `daily_features` + `daily_scores` data matrices.
- Capable of recognizing nonlinear patterns that signify impending drops before traditional standard-deviation triggers. Outputs predictions to `lstm_predictions.csv` carrying its own confidence mapping.
