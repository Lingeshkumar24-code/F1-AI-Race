import os
import sqlite3
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Union
from backend.rag.retriever import get_fia_rule_context, get_race_report_context

DB_PATH = "backend/data/f1_race_data.db"
TIRE_MODEL_PATH = "backend/models/tire_model.pkl"
PITSTOP_MODEL_PATH = "backend/models/pitstop_model.pkl"

def get_db_connection():
    """Returns a SQLite connection to the race database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_driver_stats(driver_name: str) -> str:
    """Retrieves aggregated statistics for a specific driver from telemetry database."""
    # Normalize name (capitalize)
    driver_name = driver_name.strip().title()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if driver exists
        cursor.execute("SELECT DISTINCT driver_name FROM telemetry WHERE driver_name = ?", (driver_name,))
        if not cursor.fetchone():
            # Try fuzzy check
            cursor.execute("SELECT DISTINCT driver_name FROM telemetry")
            drivers = [r[0] for r in cursor.fetchall()]
            close_matches = [d for d in drivers if driver_name.lower() in d.lower()]
            if close_matches:
                driver_name = close_matches[0]
            else:
                return f"Driver '{driver_name}' not found. Available drivers: {', '.join(drivers)}."
                
        # Main stats
        cursor.execute("""
            SELECT team, 
                   COUNT(DISTINCT race_id) as total_races, 
                   AVG(lap_time) as avg_lap, 
                   MIN(lap_time) as best_lap,
                   AVG(sector1_time) as avg_s1,
                   AVG(sector2_time) as avg_s2,
                   AVG(sector3_time) as avg_s3
            FROM telemetry 
            WHERE driver_name = ?
            GROUP BY team
        """, (driver_name,))
        row = cursor.fetchone()
        
        if not row:
            return f"No telemetry data available for driver {driver_name}."
            
        stats = dict(row)
        
        # Max tire ages before pit
        cursor.execute("""
            SELECT tire_compound, MAX(tire_age) as max_age, AVG(tire_age) as avg_age
            FROM telemetry 
            WHERE driver_name = ? AND pit_stop = 'PIT'
            GROUP BY tire_compound
        """, (driver_name,))
        tire_rows = cursor.fetchall()
        tires_info = []
        for r in tire_rows:
            tires_info.append(f"{r['tire_compound']} compound (average pit age: {r['avg_age']:.1f} laps, max age: {r['max_age']})")
            
        tires_summary = "\n- ".join(tires_info) if tires_info else "No pit stop tire telemetry available."
        
        report = (
            f"=== DRIVER DOSSIER: {driver_name} ===\n"
            f"Team: {stats['team']}\n"
            f"Total Races Logged: {stats['total_races']}\n"
            f"Average Lap Time: {stats['avg_lap']:.3f}s\n"
            f"Personal Best Lap: {stats['best_lap']:.3f}s\n"
            f"Sector Averages - S1: {stats['avg_s1']:.3f}s, S2: {stats['avg_s2']:.3f}s, S3: {stats['avg_s3']:.3f}s\n"
            f"Tire Management Strategy:\n- {tires_summary}\n"
        )
        return report
    except Exception as e:
        return f"Error retrieving driver stats: {str(e)}"
    finally:
        conn.close()

def predict_tire_life(compound: str, age: int, track_temp: float) -> str:
    """Predicts tire degradation percent and lap time loss using Random Forest."""
    compound = compound.strip().title()
    if not os.path.exists(TIRE_MODEL_PATH):
        return "Error: Tire Degradation ML Model has not been trained yet."
        
    try:
        model_data = joblib.load(TIRE_MODEL_PATH)
        model = model_data["model"]
        compound_map = model_data["compound_map"]
        
        if compound not in compound_map:
            return f"Invalid compound '{compound}'. Choose from: {list(compound_map.keys())}."
            
        compound_code = compound_map[compound]
        
        # Prepare input features
        X = pd.DataFrame([[age, compound_code, track_temp]], columns=["lap_age", "compound_code", "track_temp"])
        degradation = model.predict(X)[0]
        
        # Calculate approximate lap time loss (physically scaled)
        lap_time_loss = (degradation / 100.0) * 4.5
        
        return (
            f"=== TIRE DEGRADATION PREDICTION ===\n"
            f"Compound: {compound}\n"
            f"Tire Age: {age} laps\n"
            f"Track Temperature: {track_temp}°C\n"
            f"Predicted Tire Degradation: {degradation:.2f}%\n"
            f"Estimated Lap Time Loss: +{lap_time_loss:.3f}s per lap\n"
            f"Status: " + ("CRITICAL - PIT NOW" if degradation > 65.0 else ("WARNING - DEGRADING" if degradation > 35.0 else "HEALTHY - KEEP RUNNING"))
        )
    except Exception as e:
        return f"Error executing tire prediction: {str(e)}"

def recommend_pit_stop(lap_number: int, tire_age: int, compound: str, position: int) -> str:
    """Determines whether a driver should pit using XGBoost classifier."""
    compound = compound.strip().title()
    if not os.path.exists(PITSTOP_MODEL_PATH):
        return "Error: Pit Stop XGBoost model has not been trained yet."
        
    try:
        model_data = joblib.load(PITSTOP_MODEL_PATH)
        model = model_data["model"]
        compound_map = model_data["compound_map"]
        
        if compound not in compound_map:
            return f"Invalid compound '{compound}'. Choose from: {list(compound_map.keys())}."
            
        compound_code = compound_map[compound]
        
        # Prepare input features
        X = pd.DataFrame([[lap_number, tire_age, compound_code, position]], 
                         columns=["lap_number", "tire_age", "compound_code", "position"])
        
        prob = model.predict_proba(X)[0] # [P(NO_PIT), P(PIT)]
        prediction = model.predict(X)[0] # 0 or 1
        
        decision = "PIT" if prediction == 1 or prob[1] > 0.4 else "NO_PIT"
        pit_probability = prob[1] * 100
        
        return (
            f"=== PIT DECISION RECOMMENDATION ===\n"
            f"Lap Number: {lap_number} | Tire Age: {tire_age} laps\n"
            f"Compound: {compound} | Current Position: P{position}\n"
            f"Pit Probability Score: {pit_probability:.2f}%\n"
            f"Recommended Strategy action: **{decision}**\n"
            f"Context: " + (
                "Tire wear is critical and track position is vulnerable. Schedule a pit stop immediately." 
                if decision == "PIT" else 
                "Tire life remains within operating boundaries. Maintain track position and defer pit stop."
            )
        )
    except Exception as e:
        return f"Error executing pit recommendation: {str(e)}"

def compare_drivers(driver1: str, driver2: str) -> str:
    """Pulls and compares aggregated telemetry between two F1 drivers."""
    driver1 = driver1.strip().title()
    driver2 = driver2.strip().title()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check drivers
        cursor.execute("SELECT DISTINCT driver_name FROM telemetry")
        available_drivers = [r[0] for r in cursor.fetchall()]
        
        def resolve_fuzzy(d_name):
            matches = [d for d in available_drivers if d_name.lower() in d.lower()]
            return matches[0] if matches else None
            
        d1_resolved = resolve_fuzzy(driver1)
        d2_resolved = resolve_fuzzy(driver2)
        
        if not d1_resolved or not d2_resolved:
            return f"Could not compare. Drivers found in database: {', '.join(available_drivers)}."
            
        cursor.execute("""
            SELECT driver_name, team,
                   AVG(lap_time) as avg_lap,
                   MIN(lap_time) as best_lap,
                   AVG(sector1_time) as avg_s1,
                   AVG(sector2_time) as avg_s2,
                   AVG(sector3_time) as avg_s3,
                   AVG(tire_age) as avg_tire_stint
            FROM telemetry
            WHERE driver_name IN (?, ?)
            GROUP BY driver_name
        """, (d1_resolved, d2_resolved))
        rows = cursor.fetchall()
        
        if len(rows) < 2:
            return f"Insufficient telemetry to compare {d1_resolved} and {d2_resolved}."
            
        data = {r['driver_name']: dict(r) for r in rows}
        
        # Calculate comparison details
        summary = f"=== DRIVER COMPARISON: {d1_resolved} vs {d2_resolved} ===\n\n"
        
        for name in [d1_resolved, d2_resolved]:
            stats = data[name]
            summary += (
                f"Driver: {name} ({stats['team']})\n"
                f"- Avg Lap Time: {stats['avg_lap']:.3f}s\n"
                f"- Personal Best: {stats['best_lap']:.3f}s\n"
                f"- Sector Averages: S1={stats['avg_s1']:.3f}s, S2={stats['avg_s2']:.3f}s, S3={stats['avg_s3']:.3f}s\n"
                f"- Avg Tire Stint Age: {stats['avg_tire_stint']:.1f} laps\n\n"
            )
            
        lap_diff = abs(data[d1_resolved]['avg_lap'] - data[d2_resolved]['avg_lap'])
        faster_driver = d1_resolved if data[d1_resolved]['avg_lap'] < data[d2_resolved]['avg_lap'] else d2_resolved
        slower_driver = d2_resolved if faster_driver == d1_resolved else d1_resolved
        
        summary += f"Verdict: On average, **{faster_driver}** is faster than **{slower_driver}** by **{lap_diff:.3f}s** per lap across all recorded conditions."
        
        return summary
    except Exception as e:
        return f"Error executing driver comparison: {str(e)}"
    finally:
        conn.close()

def get_fia_rule(query: str) -> str:
    """Retrieves sporting regulations matching query via ChromaDB RAG."""
    context = get_fia_rule_context(query)
    if not context:
        return "No specific FIA rules found in database matching your query."
    return f"=== RETRIEVED FIA REGULATIONS ===\n\n{context}"

def generate_race_report(query: str) -> str:
    """Retrieves race summaries matching query via ChromaDB RAG."""
    context = get_race_report_context(query)
    if not context:
        return "No specific race reports found in database matching your query."
    return f"=== RETRIEVED RACE REPORTS ===\n\n{context}"
