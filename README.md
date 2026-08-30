# PulseIQ

PulseIQ is a full-stack intelligence platform built to detect, track, and mitigate employee burnout using behavioral data and a suite of machine learning models. The project analyzes synthetic workspace data—such as Slack messages, Jira activity, Git commits, Calendar events, and Zoom calls—to identify early warning signs of burnout before they become critical. It provides two main views: a high-level manager dashboard for team-wide risk assessment and an employee portal showing personal focus and recovery metrics.

## Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Important Code Concepts](#important-code-concepts)
- [Architectural Decisions](#architectural-decisions)
- [Data Model](#data-model)
- [Main User Flows](#main-user-flows)
- [Setup Instructions](#setup-instructions)
- [Available Scripts](#available-scripts)
- [Configuration Notes](#configuration-notes)
- [Future Improvements](#future-improvements)
- [Learning Outcomes](#learning-outcomes)

## About the Project

Traditional burnout tracking usually relies on trailing indicators like quarterly surveys or sudden drops in output. PulseIQ takes a more proactive approach. The current implementation processes simulated daily activity data across different tools (communication, code, meetings) to calculate an ongoing "Burnout Probability" alongside several sub-scores, such as the Deep Work Index, Fragmentation Score, and Recovery Debt.

The application is structured to serve two specific roles:
- **Managers** need a way to see which team members are at risk, why they are at risk, and what interventions might help (e.g., reallocating tasks or reducing Zoom load).
- **Employees** need visibility into their own working patterns so they can understand how context switching and after-hours work impact their baseline productivity.

At this stage, PulseIQ relies on synthetic data generation scripts to simulate a real engineering environment, running its models locally to output CSVs which the FastAPI backend then serves to the React frontend.

## Key Features

### Role-Based Dashboards
The React frontend splits routing based on the user's role. Managers see a team overview with risk tiering and historical trend charts. Employees see an individualized dashboard focusing on their specific daily metrics and behavioral sub-scores.

### Behavioral Burnout Engine
The core of the system calculates burnout risk based on behavioral sub-scores. For instance, the Fragmentation Score tracks context switching based on Jira and Slack activity, while Recovery Debt measures after-hours and weekend work. Per-person baselines (median and MAD) are computed first so that risk scores are relative to each individual's own historical norm.

### Machine Learning Suite
The backend coordinates a batch pipeline (`run_ml_parallel.py`) that includes:
- **Time-Series Analysis**: Uses EWMA (Exponentially Weighted Moving Average) and ARIMA forecasting to predict future burnout trends.
- **Anomaly Detection**: Uses Scikit-Learn's Isolation Forest to flag when an employee deviates significantly from their normal behavioral clusters. SHAP values are computed to explain which features drove each anomaly.
- **Deep Learning Prediction**: Uses a TensorFlow Bidirectional LSTM network to identify nonlinear patterns over a trailing window of activity.
- **Predictive Ensemble**: Combines outputs from the behavioral engine, time-series forecasting, and LSTM into a single weighted risk score across five tiers (MINIMAL → CRITICAL).

### Federated Learning Simulation
`federated_learning.py` implements a Flower (flwr) + TensorFlow federated training loop. The 30 synthetic employees are partitioned into 3 disjoint client clusters. Each client trains the LSTM locally, then a FedAvg server aggregates the weights across federated rounds. Live training metrics are saved to `pulseiq_data/federated_training_history.json` and visualized in the `FederatedLearningSimulation` React component.

### AI-Driven Narratives and Recommendations
The backend integrates with the Gemini API to generate text summaries of employee states. It also automatically drafts supportive Slack/Email messages for managers to send when a specific intervention is recommended by the engine.

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18 / Vite / TypeScript | Renders the role-based dashboards and charts |
| Styling | Tailwind CSS | Provides utility classes for responsive component design |
| Backend API | FastAPI / Uvicorn | Serves local ML data to the frontend via REST endpoints |
| Data Processing | Pandas / NumPy | Aggregates daily features and computes baseline statistics |
| NLP Sentiment | HuggingFace RoBERTa / PyTorch | Analyzes sentiment in Slack messages |
| Machine Learning | Scikit-Learn / XGBoost / SHAP | Powers anomaly detection, behavioral classification, and feature explanations |
| Time-Series | statsmodels | Computes ARIMA and seasonal decomposition forecasting |
| Deep Learning | TensorFlow (Bidirectional LSTM) | Sequential burnout prediction over trailing activity windows |
| Federated Learning | Flower (flwr) | Privacy-preserving model training across partitioned employee clusters |
| LLM Integration | Google GenAI (Gemini) | Generates narrative summaries and drafts intervention messages |

## System Architecture

PulseIQ is orchestrated by a central launcher (`run.py`) that coordinates both the Python data pipeline and the web servers.

```txt
Python Data Generators (Slack, Jira, Git, Calendar, Zoom)
  ↓
Data Processing & Feature Engineering (Pandas + RoBERTa NLP)
  ↓
Per-Person Baselines (median / MAD normalization)
  ↓
Behavioral Burnout Engine (sub-scores + SMA)
  ↓
Recommendations & Manager Insights
  ↓
Batch ML Pipeline (ARIMA, Isolation Forest, TF LSTM) — run in parallel
  ↓
Predictive Ensemble (weighted model combination)
  ↓
CSV Data Artifacts (pulseiq_data/)
  ↓
FastAPI Backend (reads CSVs, queries Gemini API)
  ↓
React Frontend (fetches JSON endpoints, renders charts)
```

The data flow is currently file-based. The pipeline processes raw synthetic logs into daily features, computes metrics, and outputs a series of CSV files. The FastAPI application then reads these artifacts into memory to serve incoming requests from the Vite application.

## Folder Structure

```txt
backend/
  api.py                      FastAPI endpoints and LLM integration
  main.py                     Orchestrates the sequential ML pipeline steps (11 stages)
  generate_data.py            Creates synthetic raw workspace activity (Slack, Jira, Git, Calendar, Zoom)
  aggregate_features.py       Processes raw data into daily metrics (RoBERTa NLP + Git + Zoom)
  compute_baselines.py        Computes per-person median / MAD baselines
  compute_burnout.py          Calculates behavioral sub-scores and burnout probability
  recommendations.py          Generates per-day action recommendations (9 categories)
  manager_insights.py         Produces manager dashboard + employee view CSVs
  run_ml_parallel.py          Batch launcher for time-series, anomaly, and LSTM steps
  time_series_analysis.py     Runs ARIMA forecasting and trend decomposition
  anomaly_detection.py        Runs Isolation Forest + SHAP feature importance
  deep_learning_model.py      Runs TensorFlow Bidirectional LSTM networks
  federated_learning.py       Flower-based federated training across 3 client partitions
  predictive_ensemble.py      Combines model outputs into a weighted ensemble risk tier
  generate_report.py          Produces the final summary CSV with crash-date forecasts
  requirements.txt            Python dependency list
src/
  pages/
    EmployeeDashboard.tsx     Individualized metric view (Radar chart, history, anomalies)
    ManagerDashboard.tsx      Team overview, intervention view, and Ask Pulse chat
    LoginScreen.tsx           Role selection entry point
  components/
    FederatedLearningSimulation.tsx  Live visualization of the federated training rounds
  api.ts                      Frontend fetch wrappers for backend endpoints
  types.ts                    TypeScript interfaces for the data model
  App.tsx                     Main routing shell checking user role
Docs/                         Detailed LaTeX and Markdown documentation of the ML steps
pulseiq_data/                 Generated CSV and JSON artifacts (created at runtime)
run.py                        Root launcher script for the pipeline and servers
```

## Important Code Concepts

### Pipeline Orchestration
The ML suite is complex and sequential. `backend/main.py` acts as a registry for 11 individual steps (generation, feature building, baseline computation, burnout scoring, recommendations, manager insights, batch ML, ensemble, and report), ensuring they run in the correct order. Specific phases can be skipped via command-line flags if the data is already generated.

### File-Based Persistence
Because PulseIQ focuses on complex ML transformations, it currently avoids a traditional relational database. Instead, the Python scripts output structured CSVs into a `pulseiq_data/` directory. The FastAPI backend functions as a read-only presentation layer over these files.

### Ask Pulse (RAG Simulation)
The backend features an `/api/llm/ask_pulse` endpoint. When a manager asks a question, the API gathers the current state from the local CSVs (employee stats, pending suggestions) and injects it into a prompt for the Gemini model, allowing the LLM to answer questions about the team using up-to-date context.

### Federated Learning Simulation
`federated_learning.py` partitions the 30 synthetic employees into 3 client clusters and runs federated rounds using Flower's FedAvg strategy. Each round saves its accuracy and loss to `pulseiq_data/federated_training_history.json`, which the `FederatedLearningSimulation.tsx` component polls to animate the training process in the browser.

### Recharts Integration
The frontend relies heavily on Recharts to visualize the time-series data generated by the backend. The dashboards map the historical daily scores and forecasts into Area and Radar charts, allowing users to see the trailing trends visually.

## Architectural Decisions

### Python Backend / Node Frontend Split
The backend is written in Python to leverage Pandas, Scikit-Learn, TensorFlow, and HuggingFace Transformers, which are the industry standards for this type of data processing and machine learning. The frontend uses React and Vite because they offer a faster, more type-safe development experience for building complex interactive dashboards compared to traditional templating engines.

### Centralized run.py Launcher
Managing a separate data pipeline, an API server, and a frontend dev server can be cumbersome. The `run.py` script simplifies this by using Python's `subprocess` module to spin up all necessary environments simultaneously. It monitors the child processes and ensures they all shut down cleanly when the user exits the script.

### Local CSV Artifacts Over a Database
Using CSV files as the handoff mechanism between the ML pipeline and the API is intentional. At this prototype stage, the primary challenge is fine-tuning the data engineering and model weights. Writing the intermediate states to disk makes it much easier to inspect the output of step 3 before running step 4, without needing to manage database migrations or schema changes.

### Federated Learning for Privacy
Partitioning employees into client clusters and aggregating only model weights (never raw data) mirrors a real privacy-preserving deployment. This design choice makes it straightforward to swap in real organizational siloes (e.g., one cluster per department) without changing the core training loop.

## Data Model

The frontend expects several specific entities from the backend, defined in `src/types.ts`:

- **EmployeeStat**: The core summary for an individual. It tracks their current productivity, burnout percentage, status (`healthy`, `warning`, `critical`), and sub-scores like `fragmentationScore` and `recoveryDebt`. It also includes the ensemble risk tier.
- **Suggestion**: An actionable recommendation generated by the engine (e.g., "Schedule Focus Blocks"). It tracks the reason for the suggestion and the manager responsible for enacting it.
- **EmployeeHistory**: A time-series entry tracking an employee's index scores over a specific date, used for drawing the historical trend charts.
- **Anomaly**: Represents an event flagged by the Isolation Forest, including the specific `triggerFeature` and `isolationScore`.
- **Forecast**: Holds the ARIMA prediction metrics, including the 7-day and 14-day forecasted probability averages.
- **EnsembleSummary**: Provides a macro view of the entire organization's risk distribution across the different tiers.

## Main User Flows

### Manager Dashboard View
1. The user logs in and selects the "manager" role.
2. The React frontend mounts `ManagerDashboard.tsx` and fetches the team's `EmployeeStat` list and `EnsembleSummary` from the API.
3. The manager reviews the Risk Distribution and the specific employees flagged as "CRITICAL" or "HIGH" risk.
4. The manager views the `Suggestion` list for recommended interventions.
5. If the manager has a question, they use the "Ask Pulse" chat interface, which queries the LLM endpoint to provide context-aware answers based on the current data.

### Employee Personal View
1. The user logs in and selects an "employee" profile.
2. The app mounts `EmployeeDashboard.tsx`.
3. The dashboard fetches the employee's specific `EmployeeHistory`, `Forecast`, and `Anomalies`.
4. The employee reviews their personal Radar chart to see if they are over-indexing on fragmentation or recovery debt, allowing them to adjust their upcoming schedule.

### Federated Learning View
1. From the manager dashboard, the user opens the Federated Learning Simulation panel.
2. The `FederatedLearningSimulation.tsx` component reads live round-by-round metrics from the backend.
3. The user can observe per-client accuracy, global model loss, and convergence across federated rounds.

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Python 3.9+

### Installation
Clone the repository, then install the dependencies for both environments.

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r backend/requirements.txt
```

### Environment Variables
The Gemini LLM integration requires an API key. Set it before running:

```bash
export GOOGLE_API_KEY="your-gemini-api-key"
```

### Running Locally
You can run the entire pipeline, backend, and frontend with a single command.

```bash
python run.py
```

This will run the 11-step ML data generation pipeline, start the FastAPI server on port 8000, and start the Vite frontend on port 5173.

**Partial run options:**

```bash
# Skip the ML pipeline entirely — just start the API + frontend (requires existing pulseiq_data/)
python run.py --skip-pipeline

# Run pipeline without the advanced ML steps (LSTM, anomaly, ensemble), then start servers
python run.py --skip-ml

# Start only the FastAPI backend
python run.py --api-only

# Start only the Vite frontend
python run.py --frontend-only
```

**Running the pipeline independently:**

```bash
# Full pipeline with all 11 steps
python backend/main.py

# Skip data generation (reuse existing CSVs)
python backend/main.py --skip-generate

# Skip feature aggregation
python backend/main.py --skip-features

# Skip advanced ML steps (time-series, anomaly, LSTM, ensemble)
python backend/main.py --skip-ml
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server independently |
| `npm run build` | Compiles TypeScript and builds the frontend for production |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint over the frontend source code |
| `python run.py` | Runs the ML pipeline, backend API, and frontend server |
| `python run.py --skip-pipeline` | Starts servers only (skips ML pipeline) |
| `python run.py --api-only` | Starts only the FastAPI backend |
| `python run.py --frontend-only` | Starts only the Vite frontend |
| `python backend/main.py` | Runs only the ML pipeline steps |

## Configuration Notes

- `vite.config.ts`: Configures the React application build and specifies the development server port (5173).
- `tailwind.config.js`: Defines the utility classes and custom color palette used throughout the dashboards.
- `tsconfig.json` & `tsconfig.node.json`: Configures the TypeScript compiler for the React frontend, enforcing strict type checking.
- `backend/requirements.txt`: Python dependencies for the full ML suite (FastAPI, TensorFlow, Flower, HuggingFace, XGBoost, SHAP, statsmodels, google-genai).

## Future Improvements

- **Database Migration**: Transition the data persistence from local CSV artifacts to a proper time-series database (like InfluxDB) or PostgreSQL to support multi-tenant data over longer periods.
- **Live Integrations**: Replace the synthetic data generation scripts with actual OAuth integrations into Slack, Jira, and GitHub APIs to process real team data.
- **Authentication**: Implement real user authentication (e.g., JWTs or Supabase Auth) instead of the current simple dropdown role selector.
- **Unit Testing**: Add a test suite (pytest for the backend, Vitest for the frontend) to ensure the data transformations and UI components remain stable as the models evolve.
- **Model Tuning**: Further tune the XGBoost and LSTM hyperparameters based on labeled real-world datasets rather than the current synthetic baselines.
- **Real Federated Deployment**: Extend the Flower simulation to a genuine multi-node setup, allowing separate organizational units to train without sharing raw employee data.

## Learning Outcomes

This project demonstrates a solid grasp of how to bridge complex data science with modern web development. It shows the ability to orchestrate an 11-step machine learning pipeline involving classical statistics, anomaly detection (with SHAP explanations), deep learning (TensorFlow Bidirectional LSTM), and privacy-preserving federated learning (Flower / FedAvg), while also exposing that data through a clean, role-based REST API. On the frontend, it highlights how to translate dense numerical output into actionable, highly visual React dashboards that cater to different user domains. It reflects strong product thinking by focusing not just on identifying a problem (burnout), but on providing the user with AI-assisted workflows to actually solve it.
