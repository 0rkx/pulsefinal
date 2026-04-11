# Assembly & Integration Flow

Once the ML modeling logic concludes, PulseIQ must combine disparate findings, generate textual warnings, and format it accurately for web transport. 

## Predictive Ensemble (`predictive_ensemble.py`)
Combines predictions into a unified truth. Since ML models generate varying levels of hallucination or variance, they need stabilization. 
- Models combine along a Weighted Average confidence framework based on model reliability:
  - **Behavioral (35%)**: Deterministic engine - highest stable accuracy.
  - **Time Series (20%)**: Moderate weight, strong pattern identifier.
  - **LSTM (30% * Dynamic Confidence Multiplier)**: High weight but actively scales itself downward if the neural network is uncertain. 
  - **Anomaly (Multiplication factor)**: If anomalous behavior triggers, it amplifies underlying score estimates.
- Determines the Disagreement index automatically (when ARIMA predicts healthy but LSTM predicts disaster) which yields the final model `confidence` interval.
- Groups probabilities into `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` and `MINIMAL` Risk Tiers.
- Automatically strings together a sentence based narrative representing the analysis finding using rule-based parsing logic ("High fragmentation from excessive meetings", "A behavioral change-point was recently detected").

## Rule-Based Recommendations (`recommendations.py`)
Applies deterministic mitigation strategies mapped from the resulting data flags. If High Interruptions are observed, pushes "Schedule Focus Blocks". If after hours pushes are flagged, assigns "Enforce Work-Life Boundary" and designates a "Workload Reallocation" peer matching heuristic. 

## API Server (`api.py`)
- Python FastAPI utilizing Uvicorn server (`http://localhost:8000`).
- Configures generic CORS logic.
- Serves endpoints (`/api/employees`, `/api/health`, `/api/suggestions`, etc).
- Loads the resultant CSV artifacts directly from the `pulseiq_data/` folder and shapes them into normalized JSON dictionaries the React TypeScript application natively ingests. 
- Formats dates, safely assigns Manager structures, handles NaN anomalies gracefully, and builds historical time-series graphing arrays logic. 

## Frontend Design
The React application (`src/`) binds to the FastAPI interfaces. It is a Vite app supporting auto-reload processing (`npm run dev`). Includes Manager dashboards (mapping their directly correlated reports) and Employee localized views. Integrates tools like `recharts` to chart historical tracking statistics supplied by the aggregated `api.py` payloads.
