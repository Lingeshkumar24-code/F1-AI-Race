import React, { useState } from 'react';
import { queryFiaRules } from '../services/api';
import { Shield, Search, ArrowRight, HelpCircle } from 'lucide-react';

const COMMON_TOPICS = [
  "Safety Car deployment procedures",
  "Unsafe release pit penalty",
  "Track limits warnings and lap deletion",
  "Speed limits in pit lane",
  "Blue flag rules for lapped cars",
  "Red flag procedure"
];

export default function FiaAssistant() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (text) => {
    const searchQuery = text || query;
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult('');
    
    if (text) setQuery(text);

    try {
      const res = await queryFiaRules(searchQuery);
      setResult(res.answer);
    } catch (err) {
      console.error(err);
      setError('RAG query execution failed. Check that ChromaDB vector store is populated and FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-f1-red/10 border border-f1-red/30 rounded-xl text-f1-red">
          <Shield size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">FIA Rules Assistant</h1>
          <p className="text-gray-400 text-sm">Query FIA Sporting and Technical sporting regulations through the semantic ChromaDB RAG pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Panel */}
        <div className="f1-glass-card p-5 rounded-lg space-y-4 h-fit">
          <h2 className="text-md font-bold text-white uppercase border-b border-gray-800 pb-2">Search Regulations</h2>
          
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Safety car speed rules"
              className="w-full f1-input pl-10 text-sm font-mono"
            />
            <Search className="absolute left-3.5 top-3 text-gray-500" size={16} />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="w-full bg-f1-red hover:bg-red-700 text-white font-bold uppercase py-2 px-4 rounded-lg tracking-wider transition duration-200 disabled:bg-gray-800"
          >
            {loading ? 'Searching ChromaDB...' : 'Retrieve Rules'}
          </button>

          {/* Quick search chips */}
          <div className="pt-2">
            <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2">Common RAG Queries:</h3>
            <div className="space-y-1.5">
              {COMMON_TOPICS.map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(topic)}
                  disabled={loading}
                  className="w-full text-left text-xs bg-white/5 hover:bg-f1-red/10 border border-white/5 hover:border-f1-red/30 rounded p-2 text-gray-300 font-mono flex justify-between items-center transition"
                >
                  <span className="truncate">{topic}</span>
                  <ArrowRight size={12} className="flex-shrink-0 ml-1.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 f1-glass-card p-5 rounded-lg flex flex-col min-h-[450px]">
          <h2 className="text-md font-bold text-white uppercase border-b border-gray-800 pb-2 mb-4">RAG Query Results</h2>
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-f1-red mb-3"></div>
              <p className="text-xs text-gray-400 font-mono uppercase animate-pulse-slow">Retrieving matched embeddings from ChromaDB...</p>
            </div>
          )}

          {error && (
            <div className="f1-glass-card p-4 border-l-4 border-f1-red rounded text-sm text-gray-300">
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4">
              {result.split("---").map((chunk, index) => {
                // If it is the header line "=== RETRIEVED FIA REGULATIONS ==="
                if (chunk.includes("=== RETRIEVED FIA REGULATIONS ===")) {
                  return null;
                }
                
                // Color-code the rule titles
                const lines = chunk.trim().split("\n");
                const title = lines[0];
                const rest = lines.slice(1).join("\n");

                return (
                  <div key={index} className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-sm leading-relaxed text-gray-300">
                    <span className="text-f1-red font-bold block border-b border-gray-800 pb-1.5 mb-2">{title}</span>
                    <span className="whitespace-pre-line text-xs">{rest}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 font-mono text-xs">
              <HelpCircle className="mb-2 opacity-50" size={36} />
              No active search query. Select a common query or type an instruction above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
