import React, { useState } from 'react';
import { predictTireLife, recommendPitStop } from '../services/api';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { Activity, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';

const DRIVERS = ["Verstappen", "Hamilton", "Leclerc", "Norris", "Russell", "Piastri", "Alonso", "Sainz", "Perez", "Gasly"];
const COMPOUNDS = ["Soft", "Medium", "Hard"];
const WEATHERS = ["Sunny", "Cloudy", "Overcast", "Rainy"];

export default function StrategyAnalyzer() {
  // Inputs
  const [driver, setDriver] = useState('Verstappen');
  const [compound, setCompound] = useState('Medium');
  const [age, setAge] = useState(10);
  const [trackTemp, setTrackTemp] = useState(30);
  const [lapNumber, setLapNumber] = useState(20);
  const [position, setPosition] = useState(5);
  
  // Results
  const [prediction, setPrediction] = useState(null);
  const [pitStopRec, setPitStopRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const predRes = await predictTireLife(compound, age, trackTemp);
      const pitRes = await recommendPitStop(lapNumber, age, compound, position);
      
      setPrediction(predRes.prediction_raw);
      setPitStopRec(pitRes.recommendation_raw);
    } catch (err) {
      console.error(err);
      setError('Simulation model execution failed. Ensure both models/tire_model.pkl and models/pitstop_model.pkl are trained.');
    } finally {
      setLoading(false);
    }
  };

  // Generate projection coordinates for the chart
  const getProjectionData = () => {
    const data = [];
    let baseDegRate = compound === 'Soft' ? 1.8 : (compound === 'Medium' ? 0.8 : 0.3);
    let ageCoef = compound === 'Soft' ? 1.4 : (compound === 'Medium' ? 1.2 : 1.05);
    let tempSens = compound === 'Soft' ? 0.05 : (compound === 'Medium' ? 0.02 : 0.008);
    let tempFactor = 1 + (trackTemp - 30.0) * tempSens;

    for (let i = 0; i <= 40; i += 2) {
      let deg = baseDegRate * Math.pow(i, ageCoef) * tempFactor;
      deg = Math.min(100.0, Math.max(0.0, deg));
      data.push({
        lap: i,
        degradation: parseFloat(deg.toFixed(1)),
        limit: 65 // F1 critical degradation threshold
      });
    }
    return data;
  };

  const projectionData = getProjectionData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">ML Race Strategy Analyzer</h1>
        <p className="text-gray-400 text-sm">Simulate pit stop decisions and tire degradation matrices using Random Forest and XGBoost</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs Column */}
        <div className="f1-glass-card p-5 rounded-lg space-y-4">
          <h2 className="text-lg font-bold text-white uppercase flex items-center gap-2">
            <Activity className="text-f1-red" size={20} />
            Simulation Inputs
          </h2>

          <div className="space-y-3">
            {/* Driver Select */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 uppercase font-semibold mb-1">Driver</label>
              <select 
                value={driver} 
                onChange={(e) => setDriver(e.target.value)}
                className="f1-input font-mono text-sm"
              >
                {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Compound Select */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 uppercase font-semibold mb-1">Tire Compound</label>
              <select 
                value={compound} 
                onChange={(e) => setCompound(e.target.value)}
                className="f1-input font-mono text-sm"
              >
                {COMPOUNDS.map(c => <option key={c} value={c}>{c} Compound</option>)}
              </select>
            </div>

            {/* Tire Age Slider */}
            <div className="flex flex-col">
              <div className="flex justify-between text-xs text-gray-400 uppercase font-semibold mb-1">
                <span>Tire Age</span>
                <span className="text-f1-red font-mono font-bold">{age} Laps</span>
              </div>
              <input 
                type="range" min="0" max="45" value={age} 
                onChange={(e) => setAge(parseInt(e.target.value))}
                className="accent-f1-red cursor-pointer"
              />
            </div>

            {/* Track Temp Slider */}
            <div className="flex flex-col">
              <div className="flex justify-between text-xs text-gray-400 uppercase font-semibold mb-1">
                <span>Track Temp</span>
                <span className="text-f1-gold font-mono font-bold">{trackTemp}°C</span>
              </div>
              <input 
                type="range" min="15" max="55" value={trackTemp} 
                onChange={(e) => setTrackTemp(parseInt(e.target.value))}
                className="accent-f1-gold cursor-pointer"
              />
            </div>

            {/* Lap Number Slider */}
            <div className="flex flex-col">
              <div className="flex justify-between text-xs text-gray-400 uppercase font-semibold mb-1">
                <span>Lap Number</span>
                <span className="text-white font-mono font-bold">Lap {lapNumber} / 50</span>
              </div>
              <input 
                type="range" min="1" max="50" value={lapNumber} 
                onChange={(e) => setLapNumber(parseInt(e.target.value))}
                className="accent-white cursor-pointer"
              />
            </div>

            {/* Position Slider */}
            <div className="flex flex-col">
              <div className="flex justify-between text-xs text-gray-400 uppercase font-semibold mb-1">
                <span>Track Position</span>
                <span className="text-blue-400 font-mono font-bold">P{position}</span>
              </div>
              <input 
                type="range" min="1" max="10" value={position} 
                onChange={(e) => setPosition(parseInt(e.target.value))}
                className="accent-blue-400 cursor-pointer"
              />
            </div>

            {/* Weather Select */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 uppercase font-semibold mb-1">Weather Context</label>
              <select className="f1-input font-mono text-sm">
                {WEATHERS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full bg-f1-red hover:bg-red-700 text-white font-bold uppercase py-2.5 px-4 rounded-lg tracking-wider transition duration-200 mt-4 disabled:bg-gray-800"
          >
            {loading ? 'Executing ML Models...' : 'Run strategy simulation'}
          </button>
        </div>

        {/* Simulation Outputs and Plots */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="f1-glass-card p-4 border-l-4 border-f1-red rounded text-sm text-gray-300">
              {error}
              <div className="text-xs text-gray-500 font-mono mt-2">
                Make sure models are generated: <code className="text-f1-red">python backend/train_ml.py</code>
              </div>
            </div>
          )}

          {/* Model predictions results */}
          {prediction || pitStopRec ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* XGBoost Pit stop recommendation */}
              <div className="f1-glass-card p-4 rounded-lg">
                <h3 className="text-xs uppercase text-gray-400 font-bold mb-2 tracking-wider">XGBoost Pit Classifier</h3>
                {pitStopRec.includes("**PIT**") ? (
                  <div className="flex items-start gap-3 p-3 bg-f1-red/10 border border-f1-red/30 rounded-lg text-f1-red">
                    <ShieldAlert size={24} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-lg uppercase tracking-wide">BOX THIS LAP</h4>
                      <p className="text-xs text-gray-300 mt-0.5 leading-relaxed font-mono">Pit window activated. Tires degraded below safety limits.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-f1-neonGreen/10 border border-f1-neonGreen/30 rounded-lg text-f1-neonGreen">
                    <CheckCircle size={24} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-lg uppercase tracking-wide">STAY OUT (STINT EXTENDED)</h4>
                      <p className="text-xs text-gray-300 mt-0.5 leading-relaxed font-mono">Lap time delta within acceptable boundaries. Keep pushing.</p>
                    </div>
                  </div>
                )}
                <div className="mt-3 p-2 bg-black/40 rounded border border-white/5 font-mono text-[10px] text-gray-400 leading-normal whitespace-pre-wrap">
                  {pitStopRec}
                </div>
              </div>

              {/* Random Forest degradation prediction */}
              <div className="f1-glass-card p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-xs uppercase text-gray-400 font-bold mb-2 tracking-wider">Random Forest Regressor</h3>
                  
                  {/* Extracting degradation percentage roughly for the UI progress bar */}
                  {(() => {
                    const match = prediction.match(/Degradation:\s*([0-9.]+)/);
                    const degVal = match ? parseFloat(match[1]) : 0;
                    const lossMatch = prediction.match(/Loss:\s*\+([0-9.]+)/);
                    const lossVal = lossMatch ? lossMatch[1] : "0.0";
                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400 font-semibold uppercase">Estimated Degradation</span>
                            <span className="text-white font-extrabold">{degVal}%</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${degVal > 65 ? 'bg-f1-red' : (degVal > 35 ? 'bg-f1-gold' : 'bg-f1-neonGreen')}`}
                              style={{ width: `${Math.min(100, degVal)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1.5 px-3 bg-white/5 rounded border border-white/5">
                          <span className="text-xs text-gray-400 uppercase font-semibold">Stint Pace Loss</span>
                          <span className="text-f1-red font-mono font-bold text-sm">+{lossVal}s / lap</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-3 p-2 bg-black/40 rounded border border-white/5 font-mono text-[10px] text-gray-400 leading-normal whitespace-pre-wrap">
                  {prediction}
                </div>
              </div>
            </div>
          ) : (
            <div className="f1-glass-card p-12 text-center rounded-lg">
              <HelpCircle className="mx-auto text-gray-600 mb-2" size={40} />
              <p className="text-gray-400 text-sm">No simulation active. Configure inputs and run Strategy Simulation.</p>
            </div>
          )}

          {/* Degradation Curve Chart */}
          <div className="f1-glass-card p-4 rounded-lg">
            <h3 className="text-sm font-bold text-white uppercase mb-4">Projected Tire Wear Curve ({compound} compound @ {trackTemp}°C)</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorDeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e10600" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#e10600" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#25252d" />
                  <XAxis dataKey="lap" stroke="#888" tick={{ fontSize: 10 }} label={{ value: 'Stint Age (Laps)', position: 'insideBottom', offset: -2 }} />
                  <YAxis stroke="#888" tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                  <Area type="monotone" dataKey="degradation" stroke="#e10600" fillOpacity={1} fill="url(#colorDeg)" name="Degradation %" />
                  <Area type="monotone" dataKey="limit" stroke="#ffffff" strokeDasharray="4 4" fill="none" name="Pirelli Critical Threshold" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
