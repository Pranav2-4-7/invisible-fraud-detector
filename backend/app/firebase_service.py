"""
Firebase Firestore Service.

Handles pushing transactions, fraud alerts, and graph stats
to Firestore collections for real-time frontend consumption.
"""

from datetime import datetime
from typing import Optional
from app.models import FraudAnalysisResult, TransactionInput


class FirebaseService:
    """
    Manages Firestore read/write operations for:
    - transactions: All incoming transactions
    - fraud_alerts: Only flagged transactions with explanations
    - graph_stats: Periodic graph statistics
    """

    def __init__(self):
        self._db = None
        self._init_firestore()

    def _init_firestore(self):
        """Initialize Firestore client."""
        try:
            from firebase_admin import firestore
            self._db = firestore.client()
            print("[OK] Firestore client initialized")
        except Exception as e:
            print(f"[WARN] Firestore initialization failed: {e}")
            print("   Running in OFFLINE mode -- data will not persist.")
            self._db = None

    @property
    def is_available(self) -> bool:
        return self._db is not None

    def push_transaction(self, transaction: TransactionInput, status: str = "pending") -> Optional[str]:
        """
        Write a transaction to the 'transactions' collection.
        Returns the Firestore document ID.
        """
        if not self.is_available:
            print(f"   [MOCK] Would push transaction {transaction.transaction_id}")
            return transaction.transaction_id

        doc_data = {
            "transaction_id": transaction.transaction_id,
            "user_id": transaction.user_id,
            "amount": transaction.amount,
            "ip_address": transaction.ip_address,
            "device_id": transaction.device_id,
            "timestamp": transaction.timestamp.isoformat(),
            "merchant": transaction.merchant,
            "currency": transaction.currency,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
        }

        doc_ref = self._db.collection("transactions").document(transaction.transaction_id)
        doc_ref.set(doc_data)
        return transaction.transaction_id

    def update_transaction_status(
        self, transaction_id: str, status: str, risk_score: float = 0.0
    ):
        """Update a transaction's status after analysis."""
        if not self.is_available:
            return

        self._db.collection("transactions").document(transaction_id).update({
            "status": status,
            "risk_score": risk_score,
            "analyzed_at": datetime.utcnow().isoformat(),
        })

    def push_fraud_alert(self, result: FraudAnalysisResult) -> Optional[str]:
        """
        Write a fraud alert to the 'fraud_alerts' collection.
        Only called for transactions that exceed the risk threshold.
        """
        if not self.is_available:
            print(f"   [MOCK] Would push fraud alert for {result.transaction_id}")
            return result.transaction_id

        # Serialize the alert
        alert_data = {
            "transaction_id": result.transaction_id,
            "user_id": result.user_id,
            "amount": result.amount,
            "timestamp": result.timestamp.isoformat(),
            "risk_score": result.risk_score,
            "risk_level": result.risk_level.value,
            "is_fraud": result.is_fraud,
            "explanation": result.explanation,

            # Graph summary
            "graph_risk_score": result.graph_report.graph_risk_score,
            "is_in_fraud_ring": result.graph_report.is_in_fraud_ring,
            "shared_device_count": result.graph_report.shared_device_count,
            "shared_ip_count": result.graph_report.shared_ip_count,
            "cluster_size": result.graph_report.cluster_size,
            "flagged_connections": [
                {
                    "entity_type": c.entity_type,
                    "entity_id": c.entity_id,
                    "connection_type": c.connection_type,
                    "flagged_reason": c.flagged_reason,
                    "hop_distance": c.hop_distance,
                }
                for c in result.graph_report.flagged_connections
            ],

            # Behavioral summary
            "behavioral_risk_score": result.behavioral_report.behavioral_risk_score,
            "anomalies": [
                {
                    "anomaly_type": a.anomaly_type,
                    "description": a.description,
                    "severity": a.severity,
                }
                for a in result.behavioral_report.anomalies
            ],

            # Subgraph for visualization
            "subgraph_nodes": result.graph_report.subgraph_nodes,
            "subgraph_edges": result.graph_report.subgraph_edges,

            # Metadata
            "processing_time_ms": result.processing_time_ms,
            "created_at": datetime.utcnow().isoformat(),
        }

        doc_ref = self._db.collection("fraud_alerts").document(result.transaction_id)
        doc_ref.set(alert_data)
        return result.transaction_id

    def push_graph_stats(self, stats: dict):
        """Push graph statistics snapshot."""
        if not self.is_available:
            return

        stats["updated_at"] = datetime.utcnow().isoformat()
        self._db.collection("graph_stats").document("latest").set(stats)

    def push_analysis_result(self, result: FraudAnalysisResult):
        """
        Push a complete analysis result:
        1. Updates the transaction status
        2. If flagged, creates a fraud alert
        """
        status = "flagged" if result.is_fraud else "cleared"
        self.update_transaction_status(
            result.transaction_id, status, result.risk_score
        )

        # Push fraud alert for medium+ risk
        if result.risk_score >= 0.2:
            self.push_fraud_alert(result)
