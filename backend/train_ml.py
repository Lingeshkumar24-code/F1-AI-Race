import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBClassifier
from sklearn.metrics import mean_squared_error, accuracy_score

# Ensure models directory exists
os.makedirs("backend/models", exist_ok=True)

# Map for categorical variables
COMPOUND_MAP = {"Soft": 0, "Medium": 1, "Hard": 2}

def train_tire_degradation():
    print("Training Tire Degradation Model...")
    df = pd.read_csv("backend/data/tire_degradation.csv")
    
    # Map tire compound to numeric
    df["compound_code"] = df["compound"].map(COMPOUND_MAP)
    
    X = df[["lap_age", "compound_code", "track_temp"]]
    y = df["degradation_percent"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    print(f"Tire Degradation Model RMSE: {rmse:.4f}")
    
    # Save model and mapping
    model_data = {
        "model": model,
        "compound_map": COMPOUND_MAP
    }
    joblib.dump(model_data, "backend/models/tire_model.pkl")
    print("Tire degradation model saved to backend/models/tire_model.pkl")

def train_pitstop_recommendation():
    print("Training Pit Stop Recommendation Model...")
    df = pd.read_csv("backend/data/race_telemetry.csv")
    
    # Map compound
    df["compound_code"] = df["tire_compound"].map(COMPOUND_MAP)
    # Map pit_stop target: PIT=1, NO_PIT=0
    df["pit_stop_code"] = df["pit_stop"].map({"PIT": 1, "NO_PIT": 0})
    
    X = df[["lap_number", "tire_age", "compound_code", "position"]]
    y = df["pit_stop_code"]
    
    # Handle Class Imbalance (Since PIT is rare, we can scale weight or just train)
    # Let's check proportions
    print(f"Target value counts:\n{y.value_counts(normalize=True)}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Calculate scale_pos_weight for imbalance
    ratio = (len(y_train) - sum(y_train)) / sum(y_train)
    
    model = XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        scale_pos_weight=ratio,
        random_state=42,
        eval_metric="logloss"
    )
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Pit Stop Model Accuracy: {acc:.4f}")
    
    # Save model and mapping
    model_data = {
        "model": model,
        "compound_map": COMPOUND_MAP
    }
    joblib.dump(model_data, "backend/models/pitstop_model.pkl")
    print("Pit stop model saved to backend/models/pitstop_model.pkl")

if __name__ == "__main__":
    train_tire_degradation()
    train_pitstop_recommendation()
    print("All ML models trained and serialized successfully!")
