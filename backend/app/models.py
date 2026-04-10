"""
Pydantic schemas for the fraud detection pipeline.
These define the contract between all system components.
"""

from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ──────────────────────────────────────────────
# Input Models
# ──────────────────────────────────────────────

class TransactionInput(BaseModel):
    """Incoming transaction to be analyzed."""
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    user_id: str
    amount: float
    ip_address: str
    device_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    merchant: str = "unknown"
    currency: str = "USD"

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_42",
                "amount": 4999.99,
                "ip_address": "185.220.101.45",
                "device_id": "dev_x8k92",
                "timestamp": "2026-04-04T03:22:00Z",
                "merchant": "CryptoExchange_X",
                "currency": "USD",
            }
        }


# ──────────────────────────────────────────────
# Graph Analysis Report
# ──────────────────────────────────────────────

class FlaggedConnection(BaseModel):
    """A connection to a known fraudulent entity."""
    entity_type: str          # "user", "device", "ip"
    entity_id: str
    connection_type: str      # "shared_device", "shared_ip", "direct"
    flagged_reason: str
    hop_distance: int = 1


class GraphRiskReport(BaseModel):
    """Output from the graph analysis engine."""
    graph_risk_score: float = 0.0
    flagged_connections: list[FlaggedConnection] = []
    shared_device_count: int = 0
    shared_ip_count: int = 0
    cluster_size: int = 1
    is_in_fraud_ring: bool = False
    subgraph_nodes: list[dict] = []
    subgraph_edges: list[dict] = []


# ──────────────────────────────────────────────
# Behavioral Analysis Report
# ──────────────────────────────────────────────

class BehavioralAnomaly(BaseModel):
    """A single behavioral anomaly detected."""
    anomaly_type: str         # "impossible_travel", "velocity", "time_anomaly"
    description: str
    severity: str             # "low", "medium", "high", "critical"
    data_points: dict = {}


class BehavioralReport(BaseModel):
    """Output from the behavioral analysis engine."""
    behavioral_risk_score: float = 0.0
    anomalies: list[BehavioralAnomaly] = []
    is_anomalous: bool = False


# ──────────────────────────────────────────────
# Final Composite Result
# ──────────────────────────────────────────────

class FraudAnalysisResult(BaseModel):
    """Complete fraud analysis output."""
    transaction_id: str
    user_id: str
    amount: float
    timestamp: datetime
    
    # Composite scoring
    risk_score: float                  # 0.0 to 1.0
    risk_level: RiskLevel
    is_fraud: bool
    
    # Detailed reports
    ml_risk_score: float = 0.0
    graph_report: GraphRiskReport
    behavioral_report: BehavioralReport
    
    # Gemini explanation
    explanation: str = ""
    
    # Metadata
    processing_time_ms: float = 0.0
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
# System Status & Action Models
# ──────────────────────────────────────────────

class ActionResponse(BaseModel):
    """Result of a command action."""
    success: bool
    message: str
    action_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: dict = {}


class SystemHealthStatus(BaseModel):
    """Detailed system health and audit status."""
    status: str
    uptime_seconds: float
    integrity_score: float
    engines: dict
    active_nodes: int
    version: str
    last_audit: datetime
