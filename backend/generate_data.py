import os
import csv
import json
import random
import sqlite3
import numpy as np
import pandas as pd

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

# Ensure data directory exists
os.makedirs("backend/data", exist_ok=True)

DRIVERS = ["Verstappen", "Hamilton", "Leclerc", "Norris", "Russell", "Piastri", "Alonso", "Sainz", "Perez", "Gasly"]
TEAMS = {
    "Verstappen": "Red Bull",
    "Perez": "Red Bull",
    "Hamilton": "Mercedes",
    "Russell": "Mercedes",
    "Leclerc": "Ferrari",
    "Sainz": "Ferrari",
    "Norris": "McLaren",
    "Piastri": "McLaren",
    "Alonso": "Aston Martin",
    "Gasly": "Alpine"
}
TRACKS = {
    "Monaco": {"base_lap": 75.0, "s1_pct": 0.30, "s2_pct": 0.40, "s3_pct": 0.30, "temp_base": 25.0},
    "Monza": {"base_lap": 80.0, "s1_pct": 0.35, "s2_pct": 0.30, "s3_pct": 0.35, "temp_base": 28.0},
    "Silverstone": {"base_lap": 90.0, "s1_pct": 0.32, "s2_pct": 0.35, "s3_pct": 0.33, "temp_base": 20.0},
    "Suzuka": {"base_lap": 92.0, "s1_pct": 0.33, "s2_pct": 0.33, "s3_pct": 0.34, "temp_base": 22.0},
    "Bahrain": {"base_lap": 94.0, "s1_pct": 0.31, "s2_pct": 0.38, "s3_pct": 0.31, "temp_base": 35.0},
    "Singapore": {"base_lap": 105.0, "s1_pct": 0.28, "s2_pct": 0.44, "s3_pct": 0.28, "temp_base": 30.0},
    "Spa": {"base_lap": 108.0, "s1_pct": 0.38, "s2_pct": 0.32, "s3_pct": 0.30, "temp_base": 18.0}
}
COMPOUNDS = ["Soft", "Medium", "Hard"]
WEATHERS = ["Sunny", "Cloudy", "Overcast", "Rainy"]

def generate_dataset_a_telemetry(num_rows=50000):
    print("Generating Dataset A - Race Telemetry...")
    # 50,000 rows. Each race has 10 drivers and 50 laps = 500 rows per race.
    # Therefore, we need exactly 100 races.
    num_races = num_rows // (len(DRIVERS) * 50)
    data = []
    
    for race_id in range(1, num_races + 1):
        track_name = random.choice(list(TRACKS.keys()))
        track_info = TRACKS[track_name]
        weather = np.random.choice(WEATHERS, p=[0.5, 0.3, 0.15, 0.05])
        
        # Track temperature is affected by weather
        base_temp = track_info["temp_base"]
        if weather == "Sunny":
            track_temp = base_temp + random.uniform(2.0, 8.0)
        elif weather == "Rainy":
            track_temp = base_temp - random.uniform(5.0, 10.0)
        else:
            track_temp = base_temp + random.uniform(-3.0, 3.0)
            
        track_temp = round(max(10.0, track_temp), 1)
        
        # Initialize driver race state
        driver_states = {}
        for idx, driver in enumerate(DRIVERS):
            # Qualy position (helps determine starting position)
            qualy_pos = idx + 1
            # Random starting compound
            compound = "Soft" if weather != "Rainy" else "Medium"
            if weather == "Rainy":
                compound = "Medium"
            else:
                compound = random.choice(["Soft", "Medium"])
                
            driver_states[driver] = {
                "tire_compound": compound,
                "tire_age": 0,
                "fuel_load": 100.0, # kg
                "total_time": 0.0,
                "position": qualy_pos,
                "team": TEAMS[driver]
            }
            
        for lap in range(1, 51):
            # Evaluate positions based on total accumulated time
            sorted_drivers = sorted(DRIVERS, key=lambda d: driver_states[d]["total_time"])
            for pos, d in enumerate(sorted_drivers):
                driver_states[d]["position"] = pos + 1
                
            for driver in DRIVERS:
                state = driver_states[driver]
                compound = state["tire_compound"]
                tire_age = state["tire_age"]
                fuel = state["fuel_load"]
                
                # Base lap calculations
                base_lap = track_info["base_lap"]
                
                # Compound characteristics
                # Soft: fast but high degradation. Medium: balanced. Hard: slower but durable.
                if compound == "Soft":
                    compound_delta = -0.8
                    degradation_rate = 0.08
                elif compound == "Medium":
                    compound_delta = 0.0
                    degradation_rate = 0.03
                else: # Hard
                    compound_delta = 0.8
                    degradation_rate = 0.012
                    
                # Weather factor
                weather_delta = 0.0
                if weather == "Rainy":
                    weather_delta = 12.0
                    
                # Fuel factor: ~1.6kg fuel burned per lap. Lap time is faster by 0.03s per kg of fuel lost.
                # Fuel load ranges from 100kg down to 20kg.
                fuel_delta = (fuel - 50.0) * 0.035
                
                # Tire wear factor: increases exponentially or linearly with age and track temp
                # Higher temp increases wear on Softs, lowers it on Hards
                temp_factor = max(0.5, track_temp / 25.0)
                wear_delta = (tire_age ** 1.3) * degradation_rate * temp_factor
                
                # Driver base skill variance
                driver_speed_offsets = {
                    "Verstappen": -0.4,
                    "Hamilton": -0.2,
                    "Leclerc": -0.25,
                    "Norris": -0.2,
                    "Russell": -0.05,
                    "Piastri": 0.0,
                    "Alonso": -0.1,
                    "Sainz": -0.08,
                    "Perez": 0.1,
                    "Gasly": 0.3
                }
                driver_delta = driver_speed_offsets[driver]
                
                # Random lap noise
                noise = np.random.normal(0, 0.15)
                
                # Total lap time calculation
                lap_time = base_lap + compound_delta + weather_delta + fuel_delta + wear_delta + driver_delta + noise
                
                # Pit stop logic
                pit_stop = 0
                pit_time = 0.0
                
                # Check if pit stop is needed
                pit_threshold = 12 if compound == "Soft" else (22 if compound == "Medium" else 35)
                # Randomize slightly
                pit_threshold += random.randint(-2, 2)
                
                if tire_age >= pit_threshold and lap < 45:
                    pit_stop = 1
                    pit_time = 22.0
                    lap_time += pit_time
                    # Reset tire
                    state["tire_age"] = 0
                    # Choose new tire
                    if compound == "Soft":
                        state["tire_compound"] = "Medium" if random.random() > 0.3 else "Hard"
                    elif compound == "Medium":
                        state["tire_compound"] = "Hard" if random.random() > 0.4 else "Soft"
                    else:
                        state["tire_compound"] = "Medium"
                else:
                    state["tire_age"] += 1
                    
                # Split sectors
                s1_base = lap_time * track_info["s1_pct"]
                s2_base = lap_time * track_info["s2_pct"]
                s3_base = lap_time * track_info["s3_pct"]
                
                # Add sector-specific noise
                s1 = round(s1_base + np.random.normal(0, 0.05), 3)
                s2 = round(s2_base + np.random.normal(0, 0.05), 3)
                s3 = round(s3_base + np.random.normal(0, 0.05), 3)
                
                # Re-calculate actual lap time sum to be precise
                lap_time = round(s1 + s2 + s3, 3)
                
                # Save record
                data.append({
                    "race_id": race_id,
                    "track_name": track_name,
                    "lap_number": lap,
                    "driver_name": driver,
                    "team": state["team"],
                    "sector1_time": s1,
                    "sector2_time": s2,
                    "sector3_time": s3,
                    "lap_time": lap_time,
                    "tire_compound": compound,
                    "tire_age": tire_age,
                    "fuel_load": round(fuel, 1),
                    "track_temperature": track_temp,
                    "position": state["position"],
                    "pit_stop": "PIT" if pit_stop == 1 else "NO_PIT",
                    "weather": weather
                })
                
                # Update driver state for next lap
                state["total_time"] += lap_time
                state["fuel_load"] = max(2.0, fuel - 1.6)
                
    df = pd.DataFrame(data)
    df.to_csv("backend/data/race_telemetry.csv", index=False)
    print(f"Dataset A generated successfully. Shape: {df.shape}")
    return df

def generate_dataset_b_tire_degradation(num_rows=20000):
    print("Generating Dataset B - Tire Degradation...")
    data = []
    
    for _ in range(num_rows):
        compound = random.choice(COMPOUNDS)
        lap_age = random.randint(0, 45)
        track_temp = round(random.uniform(15.0, 55.0), 1)
        
        # Physics based tire degradation calculation
        if compound == "Soft":
            base_deg = 1.8
            temp_sens = 0.05
            age_coef = 1.4
        elif compound == "Medium":
            base_deg = 0.8
            temp_sens = 0.02
            age_coef = 1.2
        else: # Hard
            base_deg = 0.3
            temp_sens = 0.008
            age_coef = 1.05
            
        # Degradation percent formula
        temp_factor = 1 + (track_temp - 30.0) * temp_sens
        degradation = base_deg * (lap_age ** age_coef) * temp_factor * random.uniform(0.9, 1.1)
        degradation = min(100.0, max(0.0, degradation))
        
        # Lap time loss in seconds
        lap_time_loss = (degradation / 100.0) * 4.5 * random.uniform(0.85, 1.15)
        lap_time_loss = round(max(0.0, lap_time_loss), 3)
        degradation = round(degradation, 2)
        
        data.append({
            "compound": compound,
            "lap_age": lap_age,
            "track_temp": track_temp,
            "degradation_percent": degradation,
            "lap_time_loss": lap_time_loss
        })
        
    df = pd.DataFrame(data)
    df.to_csv("backend/data/tire_degradation.csv", index=False)
    print(f"Dataset B generated successfully. Shape: {df.shape}")
    return df

def generate_dataset_c_fia_rules(num_rules=500):
    print("Generating Dataset C - FIA Regulations...")
    categories = ["Safety Car", "Virtual Safety Car", "Pit Stop", "Track Limits", "Penalties", "Qualifying", "Flags"]
    
    rules = []
    rule_id_counter = 1
    
    templates = {
        "Safety Car": [
            ("Deployment Procedure", "The Clerk of the Course may deploy the safety car if a track blockage or dangerous condition arises. All drivers must reduce speed and line up behind the safety car."),
            ("Overtaking", "No driver may overtake another car on track, including the safety car, while the safety car is deployed, except under specific directions from the Race Director."),
            ("Lapped Cars", "Once lapped cars are instructed to overtake the safety car and the lead lap, they must proceed around the track at a safe pace and join the back of the line."),
            ("Safety Car Ending", "When the safety car enters the pit lane, cars may resume racing only after they cross the First Safety Car Line."),
            ("Pit Entry", "The pit lane entrance remains open during a safety car deployment unless specifically closed by the Race Director due to an incident near the entry.")
        ],
        "Virtual Safety Car": [
            ("Deployment", "The VSC may be deployed when double waved yellow flags are needed in any section of the track and competitors may be in danger but the circumstances do not warrant the use of the safety car itself."),
            ("Speed Limit", "Drivers must comply with the minimum time limits (delta times) set by the FIA ECU in each marshalling sector. Speeds are typically reduced by 35%."),
            ("Overtaking", "Overtaking is strictly prohibited under VSC conditions, except if a driver slows down with an obvious technical problem or enters the pit lane."),
            ("Ending VSC", "When the VSC ending message is displayed, the track will go green after a random 10-15 second countdown."),
            ("Pit Stops", "Drivers are permitted to pit during a VSC. This is highly strategic as the time lost in the pits is significantly lower compared to normal racing conditions.")
        ],
        "Pit Stop": [
            ("Speed Limit", "The pit lane speed limit is set at 80 km/h for most circuits, but may be reduced to 60 km/h at tighter tracks like Monaco for safety reasons."),
            ("Release Rules", "Cars must not be released from a pit stop position in a manner which could endanger other pit lane traffic. An 'unsafe release' will incur a minimum 5-second time penalty."),
            ("Personnel Safety", "All pit crew members working on the car during a pit stop must wear approved helmets, fire-resistant suits, and safety footwear."),
            ("Tire Change", "Each team must change all four wheels during a pit stop. Mixed compound usage is forbidden; all four tires must be of the identical compound specifications."),
            ("Service Limits", "No modifications or mechanical alterations can be made to the car during a routine tire pit stop, other than front wing angle adjustments.")
        ],
        "Track Limits": [
            ("Definition", "Track limits are defined by the white lines bordering the track. A driver is judged to have left the track if no part of the car remains in contact with the track."),
            ("Violations", "Drivers who repeatedly cross track limits without a justifiable reason will receive warnings. After three warnings, a black-and-white flag is shown, and further violations incur a 5-second penalty."),
            ("Advantage gained", "If a driver leaves the track, they must not gain a lasting advantage. Any positions gained must be given back immediately."),
            ("Qualifying Lap Deletion", "Any lap time set in qualifying where a driver leaves the track boundary will be deleted by the stewards automatically."),
            ("Exceptions", "A driver will not be penalized if they are forced off the track by another competitor, subject to review by the stewards.")
        ],
        "Penalties": [
            ("5-Second Time Penalty", "The driver must stop in their pit grid for 5 seconds before any work can be carried out. If no pit stop is made, 5 seconds is added to their total race time."),
            ("10-Second Time Penalty", "Similar to the 5-second penalty, but the driver must wait for 10 seconds before mechanics touch the car."),
            ("Drive-Through Penalty", "The driver must enter the pit lane, drive through it at the speed limit, and rejoin the track without stopping at their pit box."),
            ("Stop-and-Go Penalty", "The driver must enter the pit lane, stop at their pit box for 10 seconds, and then leave. No work or tire changes are allowed during this stop."),
            ("Grid Place Penalty", "Applied to the next race start positions. Often given for power unit or gearbox changes exceeding the seasonal allocation.")
        ],
        "Qualifying": [
            ("Q1 Format", "An 18-minute session where all 20 cars participate. The slowest 5 cars are eliminated and take grid positions 16-20."),
            ("Q2 Format", "A 15-minute session for the remaining 15 cars. The slowest 5 are eliminated and take grid positions 11-15."),
            ("Q3 Format", "A 12-minute session for the top 10 cars to determine pole position and positions 1-10."),
            ("Out Lap Speed", "Drivers must not drive unnecessarily slowly during out laps to prevent blocking other drivers. Maximum lap time thresholds are monitored."),
            ("Tire Allocation", "Teams are allocated 13 sets of dry-weather tires per driver per weekend. Q3 participants must return one set of the softest compound to Pirelli.")
        ],
        "Flags": [
            ("Green Flag", "Indicates that the track is clear and racing can resume or continue normally."),
            ("Yellow Flag", "Indicates danger. Single waved yellow means reduce speed and be prepared to change direction. Double waved yellow means slow down significantly and be prepared to stop."),
            ("Red Flag", "Indicates immediate suspension of the session. Drivers must slow down immediately and proceed to the pit lane at a safe speed."),
            ("Blue Flag", "Shown to a slower car to indicate that they are about to be lapped by a faster car. The driver must allow the faster car past at the earliest opportunity."),
            ("Black-and-White Flag", "A warning to a driver for unsportsmanlike behavior or repeated track limits violations.")
        ]
    }
    
    while len(rules) < num_rules:
        category = random.choice(categories)
        item_list = templates[category]
        title, base_desc = random.choice(item_list)
        
        clause_num = f"{random.randint(10, 55)}.{random.randint(1, 9)}"
        appendix = f" Clause {random.randint(1, 5)}: Competitors must note that under sub-article {clause_num}, failure to comply will result in an immediate referral to the stewards under Sporting Regulation Appendix {random.randint(1, 12)}."
        
        rule_title = f"Article {clause_num} - {title} variation {random.randint(1, 20)}"
        rule_desc = base_desc + appendix
        
        rules.append({
            "rule_id": f"RULE-{rule_id_counter:03d}",
            "title": rule_title,
            "description": rule_desc,
            "category": category
        })
        rule_id_counter += 1
        
    with open("backend/data/fia_rules.json", "w") as f:
        json.dump(rules, f, indent=2)
    print(f"Dataset C generated successfully with {len(rules)} rules.")
    return rules

def generate_dataset_d_race_reports(num_reports=2000):
    print("Generating Dataset D - Race Reports...")
    reports = []
    
    summaries = [
        "A tactical masterclass where the winning driver managed their tires perfectly to execute a one-stop strategy, holding off a late charge from the second-place car on fresher tires.",
        "An incident-packed race featuring two Safety Cars and a late red flag. The pole sitter lost the lead at the start but fought back through superior race pace and a bold undercut during the second pit window.",
        "Rain started falling on lap 15, creating chaotic track conditions. Teams scrambled to switch to Intermediate and Wet tires. Several drivers spun off, leading to a Virtual Safety Car that decided the race podium.",
        "A dominant lights-to-flag victory, building a 15-second lead by lap 20 and controlling the race pace. Tire degradation was lower than expected, allowing a comfortable switch to hard tires for the final stint.",
        "A highly strategic race characterized by high degradation. The top three finished on different strategies: an aggressive three-stop, a standard two-stop, and a risky one-stop. The two-stop proved victorious."
    ]
    
    strategies = [
        "Soft to Medium (Lap 15) to Hard (Lap 35)",
        "Medium to Hard (Lap 22)",
        "Soft to Hard (Lap 18) to Soft (Lap 42)",
        "Wet to Intermediate (Lap 12) to Medium (Lap 30)",
        "Medium to Medium (Lap 20) to Soft (Lap 40)"
    ]
    
    for i in range(1, num_reports + 1):
        track = random.choice(list(TRACKS.keys()))
        winner = random.choice(DRIVERS)
        pole = random.choice(DRIVERS)
        fastest = random.choice(DRIVERS)
        weather = random.choice(WEATHERS)
        
        reports.append({
            "race_name": f"Grand Prix {i} - {track}",
            "winner": winner,
            "pole_position": pole,
            "fastest_lap": fastest,
            "weather": weather,
            "pit_strategy": random.choice(strategies),
            "summary": f"The GP of {track} was held under {weather.lower()} skies. {winner} clinched the victory, starting from P{random.randint(1, 10)}. {summaries[i % len(summaries)]} Pole position was held by {pole}, and the fastest lap of the race was set by {fastest}."
        })
        
    with open("backend/data/race_reports.json", "w") as f:
        json.dump(reports, f, indent=2)
    print(f"Dataset D generated successfully with {len(reports)} reports.")
    return reports

def setup_sqlite_database(telemetry_df, rules, reports):
    print("Setting up SQLite Database backend/data/f1_race_data.db...")
    db_path = "backend/data/f1_race_data.db"
    conn = sqlite3.connect(db_path)
    
    telemetry_df.to_sql("telemetry", conn, if_exists="replace", index=False)
    
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fia_rules (
            rule_id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            category TEXT
        )
    """)
    for rule in rules:
        cursor.execute(
            "INSERT OR REPLACE INTO fia_rules (rule_id, title, description, category) VALUES (?, ?, ?, ?)",
            (rule["rule_id"], rule["title"], rule["description"], rule["category"])
        )
        
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS race_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_name TEXT,
            winner TEXT,
            pole_position TEXT,
            fastest_lap TEXT,
            weather TEXT,
            pit_strategy TEXT,
            summary TEXT
        )
    """)
    for report in reports:
        cursor.execute("""
            INSERT INTO race_reports (race_name, winner, pole_position, fastest_lap, weather, pit_strategy, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            report["race_name"],
            report["winner"],
            report["pole_position"],
            report["fastest_lap"],
            report["weather"],
            report["pit_strategy"],
            report["summary"]
        ))
        
    conn.commit()
    conn.close()
    print("SQLite Database initialized and populated successfully.")

if __name__ == "__main__":
    tel_df = generate_dataset_a_telemetry()
    generate_dataset_b_tire_degradation()
    rules = generate_dataset_c_fia_rules()
    reports = generate_dataset_d_race_reports()
    setup_sqlite_database(tel_df, rules, reports)
    print("All datasets and SQLite database setup complete!")
