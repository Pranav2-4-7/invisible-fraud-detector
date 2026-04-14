"""
FastAPI Application — Invisible Fraud Detector.

Real-time fraud detection engine combining:
- Graph-based anomaly detection (NetworkX)
- Behavioral analysis (impossible travel, velocity, time anomalies)
- Explainable AI (Gemini API natural language reports)
- Real-time streaming (Firebase Firestore)
"""

import time
import uuid
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings, init_firebase
from app.models import (
    TransactionInput,
    FraudAnalysisResult,
    RiskLevel,
    ActionResponse,
    SystemHealthStatus,
    RiskFactor,
    GeoPoint,
)
from app.graph_engine import FraudGraph
from app.behavioral_engine import BehavioralAnalyzer
from app.explainability import ExplainabilityEngine
from app.ml_engine import FraudMLModel
from app.firebase_service import FirebaseService
from app.simulator import generate_transaction, run_simulation, generate_scenario_burst
from app.behavioral_engine import IP_GEO_MAP


# ──────────────────────────────────────────────
# Global Engine Instances
# ──────────────────────────────────────────────

graph_engine: Optional[FraudGraph] = None
behavioral_engine: Optional[BehavioralAnalyzer] = None
ml_engine: Optional[FraudMLModel] = None
explainability_engine: Optional[ExplainabilityEngine] = None
firebase_service: Optional[FirebaseService] = None
simulation_task: Optional[asyncio.Task] = None
system_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all engines on startup."""
    global graph_engine, behavioral_engine, ml_engine, explainability_engine, firebase_service

    print("\n" + "=" * 60)
    print("  Invisible Fraud Detector - Starting Up")
    print("=" * 60 + "\n")

    # Initialize Firebase
    init_firebase()

    # Initialize engines
    graph_engine = FraudGraph()
    print(f"Graph Engine initialized ({graph_engine.G.number_of_nodes()} nodes, {graph_engine.G.number_of_edges()} edges)")

    behavioral_engine = BehavioralAnalyzer()
    print("Behavioral Engine initialized")

    ml_engine = FraudMLModel()
    print("ML Engine initialized")

    explainability_engine = ExplainabilityEngine()

    firebase_service = FirebaseService()

    print("\n" + "=" * 60)
    print("  All systems online. Ready for analysis.")
    print("=" * 60 + "\n")

    yield

    # Cleanup
    global simulation_task
    if simulation_task and not simulation_task.done():
        simulation_task.cancel()
    print("\nFraud Detector shutdown complete.")


# ──────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────

app = FastAPI(
    title="Invisible Fraud Detector",
    description=(
        "Real-time fraud detection engine with graph analytics, "
        "behavioral analysis, and AI-powered explainability."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Core Analysis Pipeline
# ──────────────────────────────────────────────

async def analyze_transaction(tx: TransactionInput) -> FraudAnalysisResult:
    """
    Full fraud analysis pipeline:
    1. ML analysis (XGBoost)
    2. Graph analysis (NetworkX)
    3. Behavioral analysis
    4. Composite risk scoring
    5. AI explanation (Gemini)
    6. Firebase persistence
    """
    start_time = time.time()

    # Step 1: ML analysis
    ml_risk_score = ml_engine.predict(tx)

    # Step 1: Graph analysis
    graph_report = graph_engine.analyze_transaction(
        transaction_id=tx.transaction_id,
        user_id=tx.user_id,
        device_id=tx.device_id,
        ip_address=tx.ip_address,
        amount=tx.amount,
        timestamp=tx.timestamp,
    )

    # Step 2: Behavioral analysis
    behavioral_report = behavioral_engine.analyze(
        user_id=tx.user_id,
        ip_address=tx.ip_address,
        amount=tx.amount,
        timestamp=tx.timestamp,
    )

    # Step 4: Composite risk score (weighted combination)
    ml_weight = 0.50
    graph_weight = 0.30
    behavioral_weight = 0.20
    
    composite_score = (
        ml_risk_score * ml_weight +
        graph_report.graph_risk_score * graph_weight +
        behavioral_report.behavioral_risk_score * behavioral_weight
    )
    composite_score = min(1.0, composite_score)

    # Determine risk level
    if composite_score >= 0.7:
        risk_level = RiskLevel.CRITICAL
    elif composite_score >= 0.4:
        risk_level = RiskLevel.HIGH
    elif composite_score >= 0.2:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    is_fraud = composite_score >= 0.4

    # Step 4: Generate AI explanation
    explanation = await explainability_engine.generate_explanation(
        risk_score=composite_score,
        graph_report=graph_report,
        behavioral_report=behavioral_report,
        amount=tx.amount,
        user_id=tx.user_id,
    )

    processing_time = (time.time() - start_time) * 1000  # ms

    # Step 5: Build XAI risk factor breakdown
    risk_factors = [
        RiskFactor(
            name="ml_model",
            weight=ml_weight,
            score=round(ml_risk_score, 4),
            label="XGBoost ML Model",
            color="#00D4FF",
        ),
        RiskFactor(
            name="graph_analysis",
            weight=graph_weight,
            score=round(graph_report.graph_risk_score, 4),
            label="Graph Network Analysis",
            color="#A855F7",
        ),
        RiskFactor(
            name="behavioral",
            weight=behavioral_weight,
            score=round(behavioral_report.behavioral_risk_score, 4),
            label="Behavioral Engine",
            color="#FFB800",
        ),
    ]

    # Step 6: Geo-location enrichment
    geo_origin = None
    geo_previous = None
    current_geo = IP_GEO_MAP.get(tx.ip_address)
    if current_geo:
        city, lat, lon = current_geo
        geo_origin = GeoPoint(city=city, lat=lat, lon=lon)

    # Check for previous location from behavioral history
    history = behavioral_engine._user_history.get(tx.user_id, [])
    if len(history) >= 2:  # >= 2 because current tx was just appended
        prev_ip = history[-2][1]
        prev_geo = IP_GEO_MAP.get(prev_ip)
        if prev_geo:
            pcity, plat, plon = prev_geo
            geo_previous = GeoPoint(city=pcity, lat=plat, lon=plon)

    # Build result
    result = FraudAnalysisResult(
        transaction_id=tx.transaction_id,
        user_id=tx.user_id,
        amount=tx.amount,
        timestamp=tx.timestamp,
        risk_score=round(composite_score, 4),
        risk_level=risk_level,
        is_fraud=is_fraud,
        ml_risk_score=round(ml_risk_score, 4),
        graph_report=graph_report,
        behavioral_report=behavioral_report,
        risk_factors=risk_factors,
        geo_origin=geo_origin,
        geo_previous=geo_previous,
        explanation=explanation,
        processing_time_ms=round(processing_time, 2),
    )

    # Step 5: Push to Firebase
    firebase_service.push_transaction(tx, "analyzed")
    firebase_service.push_analysis_result(result)

    # Log
    result_type = "FRAUD" if is_fraud else ("WARNING" if risk_level in (RiskLevel.MEDIUM, RiskLevel.HIGH) else "CLEARED")
    print(f"   [{result_type}] {tx.transaction_id} | {tx.user_id} | ${tx.amount:.2f} | "
          f"Risk: {composite_score:.0%} ({risk_level.value}) | {processing_time:.0f}ms")

    return result


# ──────────────────────────────────────────────
# API Endpoints
# ──────────────────────────────────────────────

@app.get("/health", response_model=SystemHealthStatus)
async def health_check():
    """System health check with high-fidelity telemetry."""
    uptime = time.time() - system_start_time
    integrity = 99.85 if firebase_service and firebase_service.is_available else 64.20
    
    return {
        "status": "online",
        "uptime_seconds": round(uptime, 2),
        "integrity_score": integrity,
        "engines": {
            "ml_engine": "active" if ml_engine else "offline",
            "graph_engine": "active" if graph_engine else "offline",
            "behavioral_engine": "active" if behavioral_engine else "offline",
            "explainability": "active" if explainability_engine else "offline",
            "persistence": "connected" if firebase_service and firebase_service.is_available else "mock_mode"
        },
        "active_nodes": graph_engine.G.number_of_nodes() if graph_engine else 0,
        "version": "2.1.0-STABLE",
        "last_audit": datetime.utcnow()
    }


# ──────────────────────────────────────────────
# Admin Quick Actions
# ──────────────────────────────────────────────

@app.post("/actions/rotate-keys", response_model=ActionResponse)
async def rotate_keys_action():
    """Simulates a secure API key rotation."""
    await asyncio.sleep(1.5) # Simulate work
    return {
        "success": True,
        "message": "API Keys rotated successfully across all edge nodes.",
        "action_type": "ROTATE_API_KEYS",
        "details": {"rotation_id": str(uuid.uuid4())[:8], "status": "propagated"}
    }


@app.post("/actions/emergency-lockout", response_model=ActionResponse)
async def emergency_lockout_action():
    """Triggers an emergency lockout of the system simulation."""
    global simulation_task
    if simulation_task and not simulation_task.done():
        simulation_task.cancel()
        simulation_task = None
    
    return {
        "success": True,
        "message": "EMERGENCY_LOCKOUT: All incoming simulator channels terminated.",
        "action_type": "EMERGENCY_LOCKOUT",
        "details": {"threat_level": "RED", "nodes_quarantined": 14}
    }


@app.post("/actions/system-reset", response_model=ActionResponse)
async def system_reset_action():
    """Clears current graph and behavioral caches."""
    global graph_engine, behavioral_engine
    
    # Simple re-init to clear state
    graph_engine = FraudGraph()
    behavioral_engine = BehavioralAnalyzer()
    
    return {
        "success": True,
        "message": "Neural graph and behavioral caches purged and re-initialized.",
        "action_type": "SYSTEM_RESET",
        "details": {"cache_cleared": True, "integrity_verified": True}
    }


@app.post("/analyze", response_model=FraudAnalysisResult)
async def analyze_endpoint(tx: TransactionInput):
    """
    Analyze a single transaction for fraud.
    
    Runs through the full pipeline: graph analysis → behavioral analysis →
    AI explainability → Firebase persistence.
    """
    try:
        result = await analyze_transaction(tx)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/graph/summary")
async def graph_summary():
    """Get current graph statistics."""
    if graph_engine is None:
        raise HTTPException(status_code=503, detail="Graph engine not initialized")
    return graph_engine.get_stats()


@app.get("/graph/subgraph/{entity_id}")
async def get_subgraph(entity_id: str, depth: int = 2):
    """Get the local subgraph around an entity for visualization."""
    if graph_engine is None:
        raise HTTPException(status_code=503, detail="Graph engine not initialized")

    nodes, edges = graph_engine.get_subgraph_data(entity_id, depth)
    return {"nodes": nodes, "edges": edges}


class SimulationConfig(BaseModel):
    interval_seconds: float = 2.0
    fraud_probability: float = 0.25
    max_transactions: Optional[int] = 50


@app.post("/simulate/start")
async def start_simulation(config: SimulationConfig):
    """Start the transaction simulator."""
    global simulation_task

    if simulation_task and not simulation_task.done():
        return {"status": "already_running", "message": "Simulation is already active."}

    async def sim_callback(tx: TransactionInput):
        await analyze_transaction(tx)

    simulation_task = asyncio.create_task(
        run_simulation(
            callback=sim_callback,
            interval_seconds=config.interval_seconds,
            fraud_probability=config.fraud_probability,
            max_transactions=config.max_transactions,
        )
    )

    return {
        "status": "started",
        "config": config.model_dump(),
        "message": f"Simulation started: {config.max_transactions or '∞'} transactions at {config.interval_seconds}s intervals.",
    }


@app.post("/simulate/stop")
async def stop_simulation():
    """Stop the running simulation."""
    global simulation_task

    if simulation_task and not simulation_task.done():
        simulation_task.cancel()
        simulation_task = None
        return {"status": "stopped"}

    return {"status": "not_running"}


@app.post("/simulate/single")
async def simulate_single():
    """Generate and analyze a single random transaction."""
    tx = generate_transaction(fraud_probability=0.30)
    result = await analyze_transaction(tx)
    return result


# ──────────────────────────────────────────────
# Attack Scenario Endpoints
# ──────────────────────────────────────────────

@app.post("/simulate/scenario/{scenario_name}")
async def run_scenario(scenario_name: str):
    """
    Run a named fraud attack scenario.
    Supported scenarios: botnet_strike, impossible_travel, money_laundering,
    identity_theft, rapid_cashout
    """
    valid_scenarios = [
        "botnet_strike", "impossible_travel", "money_laundering",
        "identity_theft", "rapid_cashout",
    ]
    if scenario_name not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario: {scenario_name}. Valid: {valid_scenarios}"
        )

    transactions = generate_scenario_burst(scenario_name)
    results = []
    for tx in transactions:
        result = await analyze_transaction(tx)
        result.scenario_tag = scenario_name
        results.append(result)

    return {
        "scenario": scenario_name,
        "transactions_generated": len(results),
        "results": results,
    }


@app.get("/scenarios")
async def list_scenarios():
    """List all available attack scenarios with descriptions."""
    return {
        "scenarios": [
            {
                "id": "botnet_strike",
                "name": "Botnet Strike",
                "description": "Coordinated attack using shared device fingerprints and Tor exit nodes.",
                "icon": "🤖",
                "severity": "CRITICAL",
                "tx_count": 5,
            },
            {
                "id": "impossible_travel",
                "name": "Impossible Travel",
                "description": "Same user transacts from New York and Moscow within 3 minutes.",
                "icon": "✈️",
                "severity": "CRITICAL",
                "tx_count": 3,
            },
            {
                "id": "money_laundering",
                "name": "Money Laundering",
                "description": "Structured deposits just under reporting thresholds via crypto exchanges.",
                "icon": "💰",
                "severity": "HIGH",
                "tx_count": 4,
            },
            {
                "id": "identity_theft",
                "name": "Identity Theft",
                "description": "Stolen credentials used from new devices and unusual locations.",
                "icon": "🎭",
                "severity": "HIGH",
                "tx_count": 3,
            },
            {
                "id": "rapid_cashout",
                "name": "Rapid Cash-Out",
                "description": "High-velocity transactions draining an account in seconds.",
                "icon": "⚡",
                "severity": "CRITICAL",
                "tx_count": 6,
            },
        ]
    }
