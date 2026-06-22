import React, { useState } from 'react';
import { queryRaceReports } from '../services/api';
import { FileText, Map, Award, CloudRain } from 'lucide-react';

const TRACKS_CHIPS = ["Monaco", "Monza", "Silverstone", "Suzuka", "Bahrain", "Singapore", "Spa"];

export default function RaceReports() {
  const [query, setQuery] = useState('');
  const [reportResult, setReportResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuery = async (trackName) => {
    const searchQuery = trackName || query;
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReportResult('');
    
    if (trackName) setQuery(trackName);

    try {
      const res = await queryRaceReports(searchQuery);
      setReportResult(res.report);
    } catch (err) {
      console.error(err);
      setError('Race reports RAG retrieval failed. Ensure ChromaDB collections are loaded and FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-f1-red/10 border border-f1-red/30 rounded-xl text-f1-red">
          <FileText size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Historical Race Reports</h1>
          <p className="text-gray-400 text-sm">Retrieve and summarize historical GP race summaries, weather profiles, and pit strategies using RAG</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar queries */}
        <div className="f1-glass-card p-5 rounded-lg space-y-4 h-fit">
          <h2 className="text-md font-bold text-white uppercase border-b border-gray-800 pb-2">Report Search</h2>
          
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder="e.g. Verstappen win Spa"
              className="f1-input text-sm font-mono"
            />
            <button
              onClick={() => handleQuery()}
              disabled={loading || !query.trim()}
              className="bg-f1-red hover:bg-red-700 text-white font-bold uppercase py-2 px-4 rounded-lg tracking-wider transition duration-200 disabled:bg-gray-800"
            >
              {loading ? 'Retrieving Reports...' : 'Run Query'}
            </button>
          </div>

          <div>
            <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2">Filter by Circuit:</h3>
            <div className="flex flex-wrap gap-1.5">
              {TRACKS_CHIPS.map(track => (
                <button
                  key={track}
                  onClick={() => handleQuery(track)}
                  disabled={loading}
                  className="text-xs bg-white/5 hover:bg-f1-red/20 text-gray-300 border border-white/5 hover:border-f1-red/40 py-1.5 px-2.5 rounded transition font-mono"
                >
                  {track}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 f1-glass-card p-5 rounded-lg flex flex-col min-h-[450px]">
          <h2 className="text-md font-bold text-white uppercase border-b border-gray-800 pb-2 mb-4">GP Summary Output</h2>
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-f1-red mb-3"></div>
              <p className="text-xs text-gray-400 font-mono uppercase animate-pulse-slow">Running semantic matching on GP reports database...</p>
            </div>
          )}

          {error && (
            <div className="f1-glass-card p-4 border-l-4 border-f1-red rounded text-sm text-gray-300">
              {error}
            </div>
          )}

          {reportResult && !loading && (
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4">
              {reportResult.split("---").map((chunk, index) => {
                if (chunk.includes("=== RETRIEVED RACE REPORTS ===")) return null;
                
                const lines = chunk.trim().split("\n");
                const gpNameLine = lines[0] || "";
                
                // Parse lines for metadata display
                const winnerLine = lines.find(l => l.startsWith("Winner:"));
                const weatherLine = lines.find(l => l.startsWith("Weather:"));
                const strategyLine = lines.find(l => l.startsWith("Pit Strategy:"));
                const summaryLine = lines.find(l => l.startsWith("Summary:"));

                return (
                  <div key={index} className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-sm leading-relaxed text-gray-300">
                    <span className="text-f1-red font-bold block border-b border-gray-800 pb-1.5 mb-3">{gpNameLine}</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-xs">
                      {winnerLine && (
                        <div className="flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded border border-white/5">
                          <Award size={14} className="text-f1-gold" />
                          <span>{winnerLine}</span>
                        </div>
                      )}
                      {weatherLine && (
                        <div className="flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded border border-white/5">
                          <CloudRain size={14} className="text-blue-400" />
                          <span>{weatherLine}</span>
                        </div>
                      )}
                      {strategyLine && (
                        <div className="flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded border border-white/5 col-span-1 md:col-span-3">
                          <Map size={14} className="text-f1-neonGreen" />
                          <span>{strategyLine}</span>
                        </div>
                      )}
                    </div>

                    {summaryLine && (
                      <div className="text-xs text-gray-400 leading-relaxed font-sans bg-black/40 p-3 rounded border border-white/5">
                        <span className="font-semibold font-mono text-white block mb-1 text-[10px] uppercase">Race Analysis:</span>
                        {summaryLine.replace("Summary:", "").trim()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!reportResult && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 font-mono text-xs">
              <FileText className="mb-2 opacity-50" size={36} />
              No active race report query. Type a winner or track name, or select a circuit card above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
