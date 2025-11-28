
import React, { useState, useEffect } from 'react';
import { ParkingConfig, ParkingRecord } from './types';
import ParkingSetup from './components/ParkingSetup';
import ParkingDashboard from './components/ParkingDashboard';
import ParkingHistory from './components/ParkingHistory';
import { Car } from 'lucide-react';

const STORAGE_KEY = 'savemyparking_config';
const HISTORY_KEY = 'savemyparking_history';

type ViewState = 'home' | 'history';

const App: React.FC = () => {
  const [config, setConfig] = useState<ParkingConfig | null>(null);
  const [history, setHistory] = useState<ParkingRecord[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [loading, setLoading] = useState(true);

  // Load state from local storage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    const savedHistory = localStorage.getItem(HISTORY_KEY);

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.startTime && typeof parsed.startTime === 'number') {
           setConfig(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved config", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
            setHistory(parsed);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    setLoading(false);
  }, []);

  const handleStart = (newConfig: ParkingConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    
    // Ask for notification permission early
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleStop = () => {
    if (config) {
        const endTime = Date.now();
        const durationMs = endTime - config.startTime;
        
        // Calculate cycle count used
        const intervalMs = config.intervalMinutes * 60 * 1000;
        
        // Billing logic: If duration < grace period, cost is 0. 
        // Otherwise, simple ceiling of time/interval.
        const isFree = durationMs < (config.gracePeriodMinutes * 60 * 1000);
        const cycles = isFree ? 0 : Math.ceil(durationMs / intervalMs);
        
        // Ensure cycleCost is a number (default to 5 if missing from old config)
        const unitCost = config.cycleCost || 5;
        const totalCost = cycles * unitCost;

        const newRecord: ParkingRecord = {
            id: Date.now().toString(),
            startTime: config.startTime,
            endTime: endTime,
            locationName: config.locationName,
            intervalMinutes: config.intervalMinutes,
            totalDurationMs: durationMs,
            costCycleCount: cycles,
            cycleCost: unitCost,
            totalCost: totalCost
        };

        const updatedHistory = [...history, newRecord];
        setHistory(updatedHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    }

    setConfig(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleClearHistory = () => {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-brand-50 text-slate-800 relative selection:bg-brand-100 selection:text-brand-700">
      
      {/* Subtle Background Mesh - Warm & Minimal */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#f9e0b1] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#f09e5c] rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 pt-4 pb-12">
        {currentView === 'history' ? (
            <ParkingHistory 
                records={history} 
                onBack={() => setCurrentView('home')} 
                onClear={handleClearHistory}
            />
        ) : (
            !config ? (
              <ParkingSetup onStart={handleStart} onViewHistory={() => setCurrentView('history')} />
            ) : (
              <ParkingDashboard config={config} onStop={handleStop} />
            )
        )}
      </main>

      {/* Footer Branding - Minimalist (Only show on Home view and when not actively parking) */}
      {currentView === 'home' && !config && (
        <footer className="fixed bottom-6 w-full text-center text-slate-400 text-xs pointer-events-none">
          <div className="flex justify-center items-center gap-1.5 opacity-80">
             <div className="bg-brand-100 p-1.5 rounded-full">
               <Car className="w-3.5 h-3.5 text-brand-700" />
             </div>
             <span className="font-medium tracking-wide text-brand-900/50">SaveMyParking • 挪车宝</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
