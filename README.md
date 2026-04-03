# GhostShip - Port Intelligence System

**DP World Hackathon 2024**

## Problem
Ports handle thousands of containers daily. Fraud now occurs through data manipulation rather than physical breaches.

## Solution
4-layer intelligence system:
1. **Shipment Intelligence** - Physics and document validation
2. **Behavior Intelligence** - Company anomaly detection
3. **Network Intelligence** - Graph-based relationship detection
4. **Global Intelligence** - Route and temporal analysis

## Features
- 5 Detection Engines (Physics, Document, Behavior, Network, Scoring)
- ML Model (RandomForest, 300 estimators)
- AI Explanations (human-readable risk reasoning)
- Risk Scoring (0-100, Low/Medium/High)
- CSV + document intake via Flask API

## Quick Start

```bash
pip install -r requirements.txt
python main.py --train
python main.py --demo
```

## API + Frontend (Optional)

```bash
python api.py
cd frontend
npm install
npm run dev
```

## Demo Scenarios
- Normal Shipment - Clean, no anomalies
- Origin Fraud - Misdeclared country
- Document Mismatch - Quantity/value discrepancies
- Physics Impossible - Bananas at -18 C
- Network Fraud - Linked to suspicious entities

## Architecture

```text
┌─────────────────────────────────────┐
│         GHOSTSHIP SYSTEM            │
├─────────────────────────────────────┤
│  Layer 1: Shipment Intelligence     │
│  Layer 2: Behavior Intelligence     │
│  Layer 3: Network Intelligence      │
│  Layer 4: Global Intelligence       │
├─────────────────────────────────────┤
│  ML Model -> Fraud Probability      │
│  Rule Engines -> Anomaly Scores     │
│  Ensemble -> Final Risk Score       │
│  AI Explainer -> Human Reasoning    │
└─────────────────────────────────────┘
```

## Repo Layout

```text
ghostship/   # Python backend package (engines, ML, API, demo)
frontend/    # React + Vite UI (proxies /api to Flask)
requirements.txt
api.py       # Entrypoint shim (runs ghostship.api)
main.py      # Entrypoint shim (runs ghostship.main)
train.py     # Entrypoint shim (runs ghostship.train)
```

## Tech Stack
- Python 3.9+
- scikit-learn
- pandas, numpy
- Flask (API)
- React + Vite + Tailwind (frontend)
