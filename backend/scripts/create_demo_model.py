"""
Utility script to generate a synthetic XGBoost model for the Invisible Fraud Detector demo.
Run this script to create the `model.json` file in the backend directory.
"""

import os
import xgboost as xgb
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split

# Determine paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BACKEND_DIR, "model.json")

print("==========================================")
print("  Generating Synthetic XGBoost Model")
print("==========================================")
print(f"Target path: {MODEL_PATH}")

# 1. Generate synthetic data simulating our 30-feature space
#    We create a dataset where features map loosely to our hashed/computed inputs
print("\n[1/3] Generating synthetic training data (30 features)...")
X, y = make_classification(
    n_samples=5000, 
    n_features=30,      # 30 primary features as defined in logic.txt
    n_informative=15,   # Half the features actually matter
    n_redundant=5,
    random_state=42,
    weights=[0.85, 0.15] # 15% fraud rate in training
)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 2. Train the XGBoost model
print(f"[2/3] Training XGBoost Classifier on {len(X_train)} samples...")
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    scale_pos_weight=5, # Handle imbalance
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss'
)

model.fit(X_train, y_train)

# Quick evaluation
train_acc = model.score(X_train, y_train)
test_acc = model.score(X_test, y_test)
print(f"      -> Train Accuracy: {train_acc:.2%}")
print(f"      -> Test Accuracy:  {test_acc:.2%}")

# 3. Save the model to a JSON file
print(f"\n[3/3] Saving model to JSON format...")
model.save_model(MODEL_PATH)

if os.path.exists(MODEL_PATH):
    print(f"\n✅ Success! Model saved to: {MODEL_PATH}")
    print("   The ML Engine will now load this model during startup.")
else:
    print(f"\n❌ Error: Failed to save the model.")
