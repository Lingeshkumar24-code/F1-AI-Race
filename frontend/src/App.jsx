import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import RaceEngineerChat from './pages/RaceEngineerChat';
import StrategyAnalyzer from './pages/StrategyAnalyzer';
import DriverComparison from './pages/DriverComparison';
import FiaAssistant from './pages/FiaAssistant';
import RaceReports from './pages/RaceReports';

import { 
  Trophy, LayoutDashboard, Radio, Activity, Users, Shield, FileText, ChevronRight 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'chat', name: 'AI Race Engineer', icon: Radio, component: RaceEngineerChat },
    { id: 'strategy', name: 'Strategy Analyzer', icon: Activity, component: StrategyAnalyzer },
    { id: 'comparison', name: 'Driver Comparison', icon: Users, component: DriverComparison },
    { id: 'fia', name: 'FIA Assistant', icon: Shield, component: FiaAssistant },
    { id: 'reports', name: 'Race Reports', icon: FileText, component: RaceReports },
  ];

  const ActiveComponent = navigationItems.find(item => item.id === activeTab)?.component || Dashboard;

  return (
    <div className="flex min-h-screen bg-black text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-f1-carbon/95 border-r border-white/5 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <div className="bg-f1-red p-2 rounded-lg text-white shadow-lg shadow-f1-red/30">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-white leading-none">F1 AI ENGINEER</h2>
              <span className="text-[10px] text-f1-red font-mono uppercase tracking-wider font-semibold block mt-1">Telemetry Room</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-lg text-sm font-semibold tracking-wide transition duration-150 uppercase ${
                    isActive 
                      ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="opacity-70" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Info */}
        <div className="p-4 border-t border-white/5 bg-black/40 text-[10px] font-mono text-gray-500 space-y-1">
          <div>SYSTEM: <span className="text-f1-neonGreen font-semibold">ONLINE</span></div>
          <div>MODEL: Llama-3.3-70b</div>
          <div>VECTORDb: ChromaDB</div>
          <div className="text-[9px] text-gray-600 mt-2">© 2026 F1 AI Team</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        <ActiveComponent />
      </main>
    </div>
  );
}
