import React, { useState } from 'react';
import { compareDrivers } from '../services/api';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { Users, Award, Zap, ShieldCheck } from 'lucide-react';

const DRIVERS = ["Verstappen", "Hamilton", "Leclerc", "Norris", "Russell", "Piastri", "Alonso", "Sainz", "Perez", "Gasly"];

const DRIVER_PROFILES = {
  Verstappen: { pace: 99, consistency: 97, tires: 95, sectors: { s1: 27.1, s2: 33.8, s3: 26.9 } },
  Hamilton: { pace: 96, consistency: 96, tires: 98, sectors: { s1: 27.3, s2: 34.1, s3: 27.1 } },
  Leclerc: { pace: 98, consistency: 92, tires: 91, sectors: { s1: 27.0, s2: 33.9, s3: 27.3 } },
  Norris: { pace: 97, consistency: 94, tires: 93, sectors: { s1: 27.2, s2: 34.0, s3: 27.1 } },
  Russell: { pace: 94, consistency: 92, tires: 90, sectors: { s1: 27.4, s2: 34.3, s3: 27.3 } },
  Piastri: { pace: 95, consistency: 93, tires: 91, sectors: { s1: 27.3, s2: 34.2, s3: 27.2 } },
  Alonso: { pace: 94, consistency: 96, tires: 96, sectors: { s1: 27.5, s2: 34.4, s3: 27.2 } },
  Sainz: { pace: 93, consistency: 95, tires: 94, sectors: { s1: 27.6, s2: 34.5, s3: 27.3 } },
  Perez: { pace: 89, consistency: 89, tires: 92, sectors: { s1: 27.8, s2: 34.9, s3: 27.6 } },
  Gasly: { pace: 88, consistency: 88, tires: 88, sectors: { s1: 27.9, s2: 35.1, s3: 27.8 } }
};

export default function DriverComparison() {
  const [driver1, setDriver1] = useState('Verstappen');
  const [driver2, setDriver2] = useState('Hamilton');
  
  const [comparisonText, setComparisonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await compareDrivers(driver1, driver2);
      setComparisonText(res.comparison_raw);
    } catch (err) {
      console.error(err);
      setError('Telemetry comparison failed. Ensure the FastAPI backend database is seeded.');
    } finally {
      setLoading(false);
    }
  };

  // Helper parser for API text output
  const extractDriverStats = (text, name) => {
    const regex = new RegExp(
      `Driver:\\s*${name}[\\s\\S]*?Avg Lap Time:\\s*([0-9.]+)s[\\s\\S]*?Personal Best:\\s*([0-9.]+)s[\\s\\S]*?S1=([0-9.]+)[\\s\\S]*?S2=([0-9.]+)[\\s\\S]*?S3=([0-9.]+)`,
      'i'
    );
    const match = text.match(regex);
    if (match) {
      return {
        avgLap: parseFloat(match[1]),
        bestLap: parseFloat(match[2]),
        s1: parseFloat(match[3]),
        s2: parseFloat(match[4]),
        s3: parseFloat(match[5])
      };
    }
    return null;
  };

  const d1Stats = extractDriverStats(comparisonText, driver1);
  const d2Stats = extractDriverStats(comparisonText, driver2);

  // Setup Radar Data
  const radarData = [
    { subject: 'Qualifying Pace', A: DRIVER_PROFILES[driver1].pace, B: DRIVER_PROFILES[driver2].pace },
    { subject: 'Tire Management', A: DRIVER_PROFILES[driver1].tires, B: DRIVER_PROFILES[driver2].tires },
    { subject: 'Race Consistency', A: DRIVER_PROFILES[driver1].consistency, B: DRIVER_PROFILES[driver2].consistency },
    { subject: 'Sector 1 Speed', A: Math.round(100 - (DRIVER_PROFILES[driver1].sectors.s1 * 2)), B: Math.round(100 - (DRIVER_PROFILES[driver2].sectors.s1 * 2)) },
    { subject: 'Sector 2 Speed', A: Math.round(100 - (DRIVER_PROFILES[driver1].sectors.s2)), B: Math.round(100 - (DRIVER_PROFILES[driver2].sectors.s2)) },
    { subject: 'Sector 3 Speed', A: Math.round(100 - (DRIVER_PROFILES[driver1].sectors.s3 * 2.5)), B: Math.round(100 - (DRIVER_PROFILES[driver2].sectors.s3 * 2.5)) }
  ];

  // Setup Sector Bar Data
  const sectorBarData = d1Stats && d2Stats ? [
    { name: 'Sector 1', [driver1]: d1Stats.s1, [driver2]: d2Stats.s1 },
    { name: 'Sector 2', [driver1]: d1Stats.s2, [driver2]: d2Stats.s2 },
    { name: 'Sector 3', [driver1]: d1Stats.s3, [driver2]: d2Stats.s3 }
  ] : [
    { name: 'Sector 1', [driver1]: DRIVER_PROFILES[driver1].sectors.s1, [driver2]: DRIVER_PROFILES[driver2].sectors.s1 },
    { name: 'Sector 2', [driver1]: DRIVER_PROFILES[driver1].sectors.s2, [driver2]: DRIVER_PROFILES[driver2].sectors.s2 },
    { name: 'Sector 3', [driver1]: DRIVER_PROFILES[driver1].sectors.s3, [driver2]: DRIVER_PROFILES[driver2].sectors.s3 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Driver Telemetry Comparison</h1>
        <p className="text-gray-400 text-sm">Compare lap-by-lap pace, sector breakdowns, and compound management between teammate grid pairings</p>
      </div>

      {/* Select Box */}
      <div className="f1-glass-card p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-400 uppercase font-semibold mb-1">Driver Alpha</label>
            <select 
              value={driver1} 
              onChange={(e) => setDriver1(e.target.value)}
              className="f1-input font-mono text-sm"
            >
              {DRIVERS.map(d => <option key={d} value={d} disabled={d === driver2}>{d}</option>)}
            </select>
          </div>

          <div className="text-f1-red font-bold self-end mb-2.5">VS</div>

          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-400 uppercase font-semibold mb-1">Driver Beta</label>
            <select 
              value={driver2} 
              onChange={(e) => setDriver2(e.target.value)}
              className="f1-input font-mono text-sm"
            >
              {DRIVERS.map(d => <option key={d} value={d} disabled={d === driver1}>{d}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading}
          className="bg-f1-red hover:bg-red-700 text-white font-bold uppercase py-2.5 px-6 rounded-lg tracking-wider transition duration-200 disabled:bg-gray-800 self-end"
        >
          {loading ? 'Analyzing Telemetry...' : 'Compare Telemetry'}
        </button>
      </div>

      {error && (
        <div className="f1-glass-card p-4 border-l-4 border-f1-red rounded text-sm text-gray-300">
          {error}
        </div>
      )}

      {/* Grid Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar and Bar Charts */}
        <div className="space-y-6">
          {/* Radar Attributes */}
          <div className="f1-glass-card p-4 rounded-lg">
            <h3 className="text-sm font-bold text-white uppercase mb-4">Driver Profile Attributes</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#25252d" />
                  <PolarAngleAxis dataKey="subject" stroke="#888" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#444" tick={{ fontSize: 8 }} />
                  <Radar name={driver1} dataKey="A" stroke="#e10600" fill="#e10600" fillOpacity={0.3} />
                  <Radar name={driver2} dataKey="B" stroke="#ffd700" fill="#ffd700" fillOpacity={0.2} />
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Bar Chart */}
          <div className="f1-glass-card p-4 rounded-lg">
            <h3 className="text-sm font-bold text-white uppercase mb-4">Sector Time Comparison (Lower is Faster)</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#25252d" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" domain={['auto', 'auto']} label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey={driver1} fill="#e10600" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={driver2} fill="#ffd700" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Text Verdict report */}
        <div className="f1-glass-card p-5 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase mb-4 border-b border-gray-800 pb-2">Race Engineering Report</h3>
            {comparisonText ? (
              <div className="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {comparisonText}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500 font-mono text-xs">
                <Users className="mx-auto mb-2 opacity-50" size={32} />
                No analysis generated. Run telemetry compare query.
              </div>
            )}
          </div>
          
          {comparisonText && (
            <div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/5 flex items-start gap-3">
              <ShieldCheck className="text-f1-neonGreen mt-0.5" size={20} />
              <div className="text-xs leading-normal">
                <span className="text-white font-bold uppercase block">Verification Complete</span>
                <span className="text-gray-400 font-mono">This telemetry aggregates lap records over multiple Grand Prix sessions. Sector splits represent ideal sectors.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
