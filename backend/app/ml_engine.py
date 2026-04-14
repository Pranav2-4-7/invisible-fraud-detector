"""
Machine Learning Inference Engine.

Loads and serves predictions from an XGBoost model.
Includes a FeatureTransformer to map input data to exactly 30 features
as expected by the model.
"""

import os
import hashlib
import xgboost as xgb
import numpy as np
from typing import Optional
from app.models import TransactionInput

class FeatureTransformer:
    """
    Transforms basic transaction data into a 30-feature vector
    consistent with the IEEE-CIS Fraud Detection dataset format.
    """
    
    @staticmethod
    def _hash_to_float(string_val: str, max_val: int = 100) -> float:
        """Hash a string into a float representation for the model."""
        hashed = int(hashlib.md5(string_val.encode('utf-8')).hexdigest(), 16)
        return float(hashed % max_val)

    @classmethod
    def transform(cls, tx: TransactionInput) -> np.ndarray:
        """
        Takes raw TransactionInput and turns it into exactly 30 features.
        In a real prod system, this involves querying historical aggregates.
        For this demo, we simulate the features based on the input.
        """
        features = np.zeros(30, dtype=np.float32)

        # Basic numeric components
        features[0] = tx.amount
        features[1] = tx.timestamp.hour
        features[2] = tx.timestamp.weekday()

        # Categorical hashes
        features[3] = cls._hash_to_float(tx.device_id, max_val=100)
        features[4] = cls._hash_to_float(tx.ip_address, max_val=255)
        features[5] = cls._hash_to_float(tx.merchant, max_val=50)

        # C-Features (Counts): Simulate by seeding off the user_id hash and amount
        user_hash = cls._hash_to_float(tx.user_id, max_val=10)
        for i in range(6, 16):
            features[i] = (user_hash * (i - 5)) + (tx.amount % (i + 1))

        # V-Features (Vesta): Simulate complex relations
        device_ip_val = features[3] * features[4]
        for i in range(16, 30):
            noise = (i % 3) * 0.5
            features[i] = (device_ip_val % (i * 2 + 1)) + noise

        return features.reshape(1, -1)


class FraudMLModel:
    """
    Manages the XGBoost model lifecycle and inference.
    """

    def __init__(self, model_path: str = "model.json"):
        self.model = None
        self._load_model(model_path)

    def _load_model(self, model_path: str):
        """Attempt to load the pre-trained XGBoost `.json` model."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(base_dir, "..", model_path)
        
        try:
            if os.path.exists(full_path):
                self.model = xgb.XGBClassifier()
                self.model.load_model(full_path)
                print(f"[OK] XGBoost ML Engine loaded from {full_path}")
            else:
                print(f"[WARN] XGBoost model file not found at {full_path}")
                print("   ML Engine is running in HEURISTIC FALLBACK mode.")
        except Exception as e:
            print(f"[WARN] Failed to load XGBoost model: {e}")
            print("   ML Engine is running in HEURISTIC FALLBACK mode.")

    def predict(self, tx: TransactionInput) -> float:
        """
        Run inference on a single transaction.
        Returns a raw risk probability between 0.0 and 1.0.
        """
        if self.model is not None:
             # Real XGBoost Path
             features = FeatureTransformer.transform(tx)
             
             # Log the model matrix (feature vector) for visibility
             print(f"   [ML MATRIX] Transaction {tx.transaction_id} feature vector (1x30):")
             print(f"   {features}")

             # predict_proba returns [[prob_class_0, prob_class_1]]
             prob_fraud = self.model.predict_proba(features)[0][1]
             return float(prob_fraud)
        else:
             # Fallback Heuristic Path (if model.json is missing)
             return self._fallback_heuristic(tx)

    def _fallback_heuristic(self, tx: TransactionInput) -> float:
        """Simple baseline if ML model is completely missing."""
        risk = 0.0
        
        # High value
        if tx.amount > 1000:
            risk += 0.3
        
        # Odd hours
        if tx.timestamp.hour in (2, 3, 4, 5):
            risk += 0.2

        # Suspicious origin IPs mapped to Tor/VPNs
        if tx.ip_address in ["185.220.101.45", "91.219.237.22", "23.129.64.100"]:
            risk += 0.4

        # Suspicious device ids
        if "abc123" in tx.device_id or "xyz789" in tx.device_id:
             risk += 0.35
             
        return min(1.0, risk)
