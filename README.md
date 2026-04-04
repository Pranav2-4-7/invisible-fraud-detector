# 🚨 Invisible Fraud Detector

A real-time, production-ready fraud detection engine combining **graph-based anomaly detection**, **behavioral analytics**, and **explainable AI** — built for the *"Invisible Fraud Detector"* hackathon track.

## 🏗️ Architecture

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│    Next.js Dashboard │────▶│   FastAPI Backend     │────▶│   Firebase Firestore │
│  (Real-Time UI)      │◀────│   (Analysis Engine)   │────▶│   (Real-Time DB)     │
└──────────────────────┘     └──────┬───────┬────────┘     └──────────────────────┘
                                   │       │
                         ┌─────────┘       └─────────┐
                         ▼                           ▼
               ┌──────────────────┐       ┌──────────────────┐
               │   NetworkX       │       │   Gemini API     │
               │   (Graph Engine) │       │   (Explainability)│
               └──────────────────┘       └──────────────────┘
```

## 🚀 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your API keys
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Run Demo
1. Start backend: `python run.py` (runs on `localhost:8000`)
2. Start frontend: `npm run dev` (runs on `localhost:3000`)
3. Open dashboard → Click "Start Simulation"
4. Watch real-time fraud detection in action!

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyze a single transaction |
| POST | `/simulate/start` | Start transaction simulator |
| POST | `/simulate/stop` | Stop simulation |
| POST | `/simulate/single` | Generate & analyze one random transaction |
| GET | `/graph/summary` | Get graph statistics |
| GET | `/graph/subgraph/{id}` | Get entity subgraph |
| GET | `/health` | System health check |

## 🧠 How It Works

1. **Graph Engine** (NetworkX): Maintains a multi-relational graph of users, devices, and IPs. Detects shared infrastructure, fraud rings, and 2-hop connections to flagged entities.

2. **Behavioral Engine**: Analyzes transaction patterns for impossible travel, velocity abuse, time anomalies, and amount deviations.

3. **Explainability Layer** (Gemini API): Translates complex graph and behavioral data into 2-sentence human-readable fraud reports.

4. **Real-Time Dashboard** (Next.js): Live transaction feed, fraud alerts with AI explanations, and interactive network graph visualization.

## 👨‍💻 Team
Built for the "Invisible Fraud Detector" hackathon track.
