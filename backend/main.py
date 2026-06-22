import os
import sqlite3
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from backend.agent.graph import run_f1_agent
from backend.agent.tools import (
    predict_tire_life,
    recommend_pit_stop,
    compare_drivers,
    get_fia_rule,
    generate_race_report
)

app = FastAPI(
    title="F1 AI Race Engineer API",
    description="Backend services for telemetry analysis, ML predictions, RAG, and agentic race strategy.",
    version="1.0.0"
)

# Enable CORS for React integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "backend/data/f1_race_data.db"

# Pydantic Schemas
class ChatRequest(BaseModel):
    message: str = Field(..., example="Should Verstappen pit now?")
    history: List[Dict[str, str]] = Field(default=[], example=[{"role": "user", "content": "Hello"}])

class TirePredictionRequest(BaseModel):
    compound: str = Field(..., example="Soft")
    age: int = Field(..., example=12)
    track_temp: float = Field(..., example=38.5)

class PitStopRequest(BaseModel):
    lap_number: int = Field(..., example=25)
    tire_age: int = Field(..., example=15)
    compound: str = Field(..., example="Soft")
    position: int = Field(..., example=3)

class DriverComparisonRequest(BaseModel):
    driver1: str = Field(..., example="Verstappen")
    driver2: str = Field(..., example="Hamilton")

class RAGRequest(BaseModel):
    query: str = Field(..., example="Safety car rules during heavy rain")


# Helper DB Function
def query_db(query: str, params=()) -> List[Dict[str, Any]]:
    """Helper to query sqlite and return dictionaries."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file missing. Run generate_data.py first.")
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


# Routes
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Executes the LangGraph agent workflow to handle driver query."""
    try:
        response = run_f1_agent(request.message, request.history)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent workflow error: {str(e)}")

@app.post("/predict-tire")
async def predict_tire_endpoint(request: TirePredictionRequest):
    """Predicts tire degradation and returns technical details."""
    result = predict_tire_life(request.compound, request.age, request.track_temp)
    if "Error" in result:
        raise HTTPException(status_code=400, detail=result)
    return {"prediction_raw": result}

@app.post("/recommend-pit")
async def recommend_pit_endpoint(request: PitStopRequest):
    """Evaluates telemetry using XGBoost and recommends PIT or NO_PIT."""
    result = recommend_pit_stop(request.lap_number, request.tire_age, request.compound, request.position)
    if "Error" in result:
        raise HTTPException(status_code=400, detail=result)
    return {"recommendation_raw": result}

@app.post("/compare-drivers")
async def compare_drivers_endpoint(request: DriverComparisonRequest):
    """Compares key F1 performance stats of two drivers."""
    result = compare_drivers(request.driver1, request.driver2)
    if "Error" in result:
        raise HTTPException(status_code=400, detail=result)
    return {"comparison_raw": result}

@app.post("/fia-assistant")
async def fia_assistant_endpoint(request: RAGRequest):
    """Retrieves relevant rules and answers safety/sporting regulation queries."""
    result = get_fia_rule(request.query)
    return {"answer": result}

@app.post("/generate-report")
async def generate_report_endpoint(request: RAGRequest):
    """Generates synthetic race summary and strategy analysis."""
    result = generate_race_report(request.query)
    return {"report": result}

@app.get("/dashboard-stats")
async def dashboard_stats_endpoint():
    """Compiles aggregated telemetry statistics for dashboard visualizations."""
    # Summary KPI card data
    total_laps_query = "SELECT COUNT(*) as count FROM telemetry"
    total_races_query = "SELECT COUNT(DISTINCT race_id) as count FROM telemetry"
    drivers_query = "SELECT DISTINCT driver_name FROM telemetry"
    
    laps_count = query_db(total_laps_query)[0]["count"]
    races_count = query_db(total_races_query)[0]["count"]
    drivers = [row["driver_name"] for row in query_db(drivers_query)]
    
    # Average lap time per compound
    avg_laps_compound = query_db("""
        SELECT tire_compound as compound, AVG(lap_time) as avg_lap 
        FROM telemetry 
        GROUP BY tire_compound
    """)
    
    # Tire compound count (for donut chart)
    tire_usage = query_db("""
        SELECT tire_compound as compound, COUNT(*) as count 
        FROM telemetry 
        GROUP BY tire_compound
    """)
    
    # Weather impact on average lap time
    weather_impact = query_db("""
        SELECT weather, AVG(lap_time) as avg_lap 
        FROM telemetry 
        GROUP BY weather
    """)
    
    # Driver speed list
    driver_speed = query_db("""
        SELECT driver_name as name, team, AVG(lap_time) as avg_lap, MIN(lap_time) as best_lap
        FROM telemetry 
        GROUP BY driver_name 
        ORDER BY avg_lap ASC
    """)
    
    # Monza lap degradation (Sample line chart progression for lap 1 to 50)
    lap_degradation = query_db("""
        SELECT lap_number, 
               AVG(CASE WHEN tire_compound='Soft' THEN lap_time END) as soft_lap,
               AVG(CASE WHEN tire_compound='Medium' THEN lap_time END) as medium_lap,
               AVG(CASE WHEN tire_compound='Hard' THEN lap_time END) as hard_lap
        FROM telemetry 
        WHERE track_name = 'Monza'
        GROUP BY lap_number
        ORDER BY lap_number
    """)
    
    # Track average temperatures
    track_temps = query_db("""
        SELECT track_name as track, AVG(track_temperature) as avg_temp
        FROM telemetry
        GROUP BY track_name
    """)

    return {
        "summary": {
            "total_data_points": laps_count,
            "total_races": races_count,
            "drivers_count": len(drivers),
            "drivers": drivers
        },
        "avg_lap_per_compound": avg_laps_compound,
        "tire_usage": tire_usage,
        "weather_impact": weather_impact,
        "driver_speed": driver_speed,
        "lap_degradation": lap_degradation,
        "track_temps": track_temps
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
