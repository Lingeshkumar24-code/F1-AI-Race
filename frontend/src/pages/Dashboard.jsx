import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Zap, Users, Shield, Award, Calendar, Thermometer, CloudRain } from 'lucide-react';

const COLORS = ['#e10600', '#ffd700', '#00ff66', '#8884d8', '#82ca9d', '#ffc658'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard metrics. Ensure the backend server is running and data is generated.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-f1-red mb-4"></div>
        <p className="text-gray-400 font-medium">Acquiring race telemetry stream...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="f1-glass-card p-6 border-l-4 border-f1-red rounded-lg max-w-xl mx-auto my-12">
        <h3 className="text-xl font-bold text-white mb-2">Telemetry Connection Offline</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <div className="bg-black/50 p-4 rounded text-xs font-mono text-gray-400">
          Tip: Run the synthetic generator first: <br />
          <code className="text-f1-red">python backend/generate_data.py</code>
        </div>
      </div>
    );
  }

  const { summary, avg_lap_per_compound, tire_usage, weather_impact, driver_speed, lap_degradation, track_temps } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Race Telemetry Dashboard</h1>
        <p className="text-gray-400 text-sm">Real-time analytical telemetry feeds from simulated Grand Prix events</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="f1-glass-card p-4 rounded-lg f1-border-left">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Total Telemetry Data</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {summary.total_data_points.toLocaleString()} <span className="text-xs text-gray-500 font-normal">laps</span>
              </h3>
            </div>
            <div className="p-2 bg-f1-red/10 rounded-lg text-f1-red">
              <Zap size={20} />
            </div>
          </div>
        </div>

        <div className="f1-glass-card p-4 rounded-lg border-l-4 border-f1-gold">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Simulated Races</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {summary.total_races} <span className="text-xs text-gray-500 font-normal">GPs</span>
              </h3>
            </div>
            <div className="p-2 bg-f1-gold/10 rounded-lg text-f1-gold">
              <Calendar size={20} />
            </div>
          </div>
        </div>

        <div className="f1-glass-card p-4 rounded-lg border-l-4 border-f1-neonGreen">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Active Drivers</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{summary.drivers_count}</h3>
            </div>
            <div className="p-2 bg-f1-neonGreen/10 rounded-lg text-f1-neonGreen">
              <Users size={20} />
            </div>
          </div>
        </div>

        <div className="f1-glass-card p-4 rounded-lg border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">RAG DB Corpus</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">ChromaDB</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Shield size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monza Lap Degradation Curve */}
        <div className="f1-glass-card p-4 rounded-lg lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Monza Lap Degradation Curve (Lap vs. Time)</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lap_degradation} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#25252d" />
                <XAxis dataKey="lap_number" stroke="#888" label={{ value: 'Lap Number', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="#888" domain={['auto', 'auto']} label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="soft_lap" stroke="#e10600" name="Soft Compound" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="medium_lap" stroke="#ffd700" name="Medium Compound" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="hard_lap" stroke="#ffffff" name="Hard Compound" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tire Usage Donut */}
        <div className="f1-glass-card p-4 rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-4 uppercase">Tire Compound Allocation</h2>
          </div>
          <div className="h-[200px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tire_usage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="compound"
                >
                  {tire_usage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-xs text-white pb-2">
            {tire_usage.map((t, idx) => (
              <div key={t.compound} className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span>{t.compound} ({((t.count / summary.total_data_points) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Weather & Compounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compound Laptimes Comparison */}
        <div className="f1-glass-card p-4 rounded-lg">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Average Pace by Compound</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avg_lap_per_compound} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#25252d" />
                <XAxis type="number" stroke="#888" domain={['dataMin - 5', 'dataMax + 2']} />
                <YAxis dataKey="compound" type="category" stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                <Bar dataKey="avg_lap" radius={[0, 4, 4, 0]}>
                  {avg_lap_per_compound.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Impact */}
        <div className="f1-glass-card p-4 rounded-lg">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Weather Impact on Lap Times</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weather_impact} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#25252d" />
                <XAxis dataKey="weather" stroke="#888" />
                <YAxis stroke="#888" domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                <Bar dataKey="avg_lap" fill="#38383f" radius={[4, 4, 0, 0]}>
                  {weather_impact.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.weather === 'Rainy' ? '#e10600' : (entry.weather === 'Sunny' ? '#ffb800' : '#4f4f5f')} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Leaderboard and Track Temps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Track Temperatures */}
        <div className="f1-glass-card p-4 rounded-lg lg:col-span-1">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Track Temperatures (°C)</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={track_temps} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#25252d" />
                <XAxis dataKey="track" stroke="#888" tick={{ fontSize: 10 }} />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#15151e', borderColor: '#333', color: '#fff' }} />
                <Bar dataKey="avg_temp" fill="#ffb800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Speed Rankings Table */}
        <div className="f1-glass-card p-4 rounded-lg lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Driver Telemetry Performance Rankings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase text-gray-400">
                  <th className="py-2 px-3">Pos</th>
                  <th className="py-2 px-3">Driver</th>
                  <th className="py-2 px-3">Constructor</th>
                  <th className="py-2 px-3 text-right">Avg Lap time</th>
                  <th className="py-2 px-3 text-right font-semibold">Personal Best</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 text-sm">
                {driver_speed.slice(0, 10).map((d, index) => (
                  <tr key={d.name} className="hover:bg-white/5 transition duration-150">
                    <td className="py-2 px-3 font-semibold text-f1-gold">P{index + 1}</td>
                    <td className="py-2 px-3 font-medium text-white">{d.name}</td>
                    <td className="py-2 px-3 text-gray-400">{d.team}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{d.avg_lap.toFixed(3)}s</td>
                    <td className="py-2 px-3 text-right text-f1-neonGreen font-semibold">{d.best_lap.toFixed(3)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
