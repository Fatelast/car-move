import React, { useEffect, useState, useMemo } from 'react';
import { ParkingConfig, ParkingStatus } from '../types';
import { AlertTriangle, Bell, CheckCircle, StopCircle, MapPin, X, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ParkingDashboardProps {
  config: ParkingConfig;
  onStop: () => void;
}

const ParkingDashboard: React.FC<ParkingDashboardProps> = ({ config, onStop }) => {
  const [now, setNow] = useState(Date.now());
  
  // Safely initialize permission state
  const [permission, setPermission] = useState(() => {
    if (typeof Notification !== 'undefined') {
      return Notification.permission;
    }
    return 'default';
  });

  const [showImageModal, setShowImageModal] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [lastNotificationKey, setLastNotificationKey] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    
    // Safely request permission only if API exists
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
        .then(setPermission)
        .catch(err => console.error("Failed to request notification permission:", err));
    }
    return () => clearInterval(timer);
  }, []);

  const { totalDurationFormatted, remainingMs, status, progressPercentage, cycleCount } = useMemo(() => {
    const elapsedMs = now - config.startTime;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const currentCycleElapsedMs = elapsedMs % intervalMs;
    const msUntilNextCycle = intervalMs - currentCycleElapsedMs;
    const currentCycleIndex = Math.floor(elapsedMs / intervalMs) + 1;
    const hours = Math.floor(elapsedMs / 3600000);
    const mins = Math.floor((elapsedMs % 3600000) / 60000);
    
    let currentStatus = ParkingStatus.SAFE;
    const remainingMins = msUntilNextCycle / 60000;
    
    if (remainingMins <= 5) {
      currentStatus = ParkingStatus.DANGER;
    } else if (remainingMins <= config.reminderMinutes) {
      currentStatus = ParkingStatus.WARNING;
    }

    return {
      totalDurationFormatted: `${hours}小时 ${mins}分钟`,
      remainingMs: msUntilNextCycle,
      status: currentStatus,
      progressPercentage: (currentCycleElapsedMs / intervalMs) * 100,
      cycleCount: currentCycleIndex
    };
  }, [now, config]);

  useEffect(() => {
    if (status === ParkingStatus.WARNING || status === ParkingStatus.DANGER) {
      const currentKey = `${cycleCount}-${status}`;
      // Safely check for Notification support before creating one
      if (lastNotificationKey !== currentKey && permission === 'granted' && typeof Notification !== 'undefined') {
         const remainingMinutesRaw = Math.ceil(remainingMs / 60000);
         try {
           new Notification("挪车宝提醒", {
             body: `快去挪车！距离下一个计费周期仅剩 ${remainingMinutesRaw} 分钟！`,
             icon: '/vite.svg',
             tag: 'parking-reminder'
           });
         } catch (e) {
           console.error("Notification creation failed", e);
         }
         
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
         audio.play().catch(e => console.log("Audio play failed interaction required", e));
         setLastNotificationKey(currentKey);
      }
    }
  }, [status, cycleCount, lastNotificationKey, permission, remainingMs]);

  const chartData = [
    { name: 'Elapsed', value: progressPercentage },
    { name: 'Remaining', value: 100 - progressPercentage },
  ];

  const getColor = () => {
    switch (status) {
      case ParkingStatus.SAFE: return '#10b981'; // Emerald 500 (Keep green for Safety)
      case ParkingStatus.WARNING: return '#f09e5c'; // Palette: Sandy Orange
      case ParkingStatus.DANGER: return '#9b2d3b'; // Palette: Deep Red
      default: return '#e67e5b'; // Palette: Terracotta
    }
  };

  const statusColor = getColor();
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
  const remainingMinutes = Math.floor(remainingMs / 60000);

  return (
    <div className="flex flex-col items-center justify-between min-h-[90vh] py-6 px-4 w-full max-w-md mx-auto animate-fade-in relative">
      
      {/* Header Info - Clean Card */}
      <div className="w-full flex justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border border-brand-100">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">当前已停</p>
          <p className="text-2xl font-mono text-slate-800 font-bold">{totalDurationFormatted}</p>
        </div>
        <div className="text-right">
           <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">正在计费</p>
           <p className="text-xl font-bold text-brand-600">第 {cycleCount} 周期</p>
        </div>
      </div>

      {/* Main Visual - Donut Chart with Warm Colors */}
      <div className="relative w-72 h-72 flex items-center justify-center mb-8">
        <div 
          className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-1000 transform scale-90"
          style={{ backgroundColor: statusColor }}
        ></div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={95}
              outerRadius={115}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              cornerRadius={8}
              paddingAngle={2}
            >
              <Cell key="elapsed" fill={statusColor} />
              {/* Light warm gray for the empty part */}
              <Cell key="remaining" fill="#fff7ed" /> 
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <p className="text-slate-400 text-sm font-medium mb-1">距离下一周期</p>
          <div className={`text-5xl font-mono font-bold tracking-tighter transition-all duration-300 ${
            status === ParkingStatus.DANGER ? 'text-[#9b2d3b] animate-pulse-fast scale-110' : 
            status === ParkingStatus.WARNING ? 'text-[#e67e5b] animate-pulse' : 
            'text-slate-800'
          }`}>
            {remainingMinutes}:{remainingSeconds.toString().padStart(2, '0')}
          </div>
           {status !== ParkingStatus.SAFE && (
            <div className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all duration-300 ${
              status === ParkingStatus.DANGER ? 'bg-[#fff5f5] text-[#9b2d3b] border border-[#9b2d3b]/20 scale-105' : 'bg-[#fffbf0] text-[#f09e5c] border border-[#f09e5c]/20'
            }`}>
              <AlertTriangle className={`w-3.5 h-3.5 ${status === ParkingStatus.DANGER ? 'animate-bounce' : ''}`} />
              {status === ParkingStatus.DANGER ? '必须挪车' : '准备挪车'}
            </div>
          )}
        </div>
      </div>

      {/* Action Area */}
      <div className="w-full space-y-4">
        
        {config.locationImage && (
          <button 
            onClick={() => setShowImageModal(true)}
            className="w-full bg-white hover:bg-brand-50 active:bg-brand-100 border border-brand-200 shadow-sm p-4 rounded-xl flex items-center justify-center gap-2 text-slate-600 font-medium transition-all active:scale-[0.98]"
          >
            <MapPin className="w-5 h-5 text-brand-500" />
            <span>查看停车位置</span>
          </button>
        )}

        {status === ParkingStatus.SAFE ? (
           <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex items-start gap-3 shadow-sm">
             <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
             <div>
               <p className="text-emerald-700 font-semibold text-sm">时间充裕</p>
               <p className="text-emerald-600/80 text-xs mt-1 leading-relaxed">
                 距离提醒还有 {Math.max(0, remainingMinutes - config.reminderMinutes)} 分钟。您可以安心办事。
               </p>
             </div>
           </div>
        ) : (
          <div className={`border p-5 rounded-2xl flex items-start gap-3 shadow-sm transition-colors duration-300 ${
             status === ParkingStatus.DANGER ? 'bg-[#fff5f5] border-[#9b2d3b]/20' : 'bg-[#fffbf0] border-[#f09e5c]/20'
          }`}>
             <Bell className={`w-5 h-5 shrink-0 mt-0.5 ${status === ParkingStatus.DANGER ? 'text-[#9b2d3b] animate-pulse-fast' : 'text-[#f09e5c]'}`} />
             <div>
               <p className={`font-semibold text-sm ${status === ParkingStatus.DANGER ? 'text-[#9b2d3b]' : 'text-[#d45b3a]'}`}>
                 {status === ParkingStatus.DANGER ? '立即行动！' : '注意时间'}
               </p>
               <p className={`text-xs mt-1 leading-relaxed ${status === ParkingStatus.DANGER ? 'text-[#9b2d3b]/80' : 'text-[#d45b3a]/80'}`}>
                 为了省下那一个周期的停车费，建议您现在前往取车。
               </p>
             </div>
           </div>
        )}

        <button
          onClick={() => setShowStopConfirm(true)}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 active:bg-red-100 text-slate-400 hover:text-[#9b2d3b] font-medium py-4 rounded-xl border border-slate-200 hover:border-[#9b2d3b]/30 transition-all mt-4 active:scale-[0.98]"
        >
          <StopCircle className="w-5 h-5" />
          结束停车 / 已离开
        </button>
      </div>

      {/* Image Modal */}
      {showImageModal && config.locationImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowImageModal(false)}>
          <div className="relative w-full max-w-lg bg-white p-2 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
             <button 
               onClick={() => setShowImageModal(false)}
               className="absolute -top-14 right-0 p-3 text-white bg-slate-800/80 rounded-full active:scale-95 transition-transform"
             >
               <X className="w-6 h-6" />
             </button>
             <img 
               src={config.locationImage} 
               alt="Saved parking location" 
               className="w-full h-auto rounded-xl border border-brand-100 max-h-[70vh] object-contain bg-black"
             />
             <div className="p-3 text-center">
               <p className="text-slate-500 text-sm flex items-center justify-center gap-2 font-medium">
                 <MapPin className="w-4 h-4 text-brand-500" /> 您的停车位置快照
               </p>
             </div>
          </div>
        </div>
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/20 backdrop-blur-sm p-6 animate-fade-in" onClick={() => setShowStopConfirm(false)}>
          <div className="bg-white rounded-3xl border border-brand-100 w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-[#fffbf0] p-4 rounded-full">
                <AlertCircle className="w-8 h-8 text-[#f09e5c]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">结束停车?</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  这将清除当前的计时和照片。确认您已经把车开走了吗？
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button 
                  onClick={() => setShowStopConfirm(false)}
                  className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 active:scale-95 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={onStop}
                  className="w-full py-3.5 rounded-xl bg-[#e67e5b] text-white font-semibold hover:bg-[#d45b3a] hover:shadow-lg active:scale-95 transition-all"
                >
                  确定结束
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParkingDashboard;