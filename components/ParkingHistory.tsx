
import React from 'react';
import { ParkingRecord } from '../types';
import { ArrowLeft, MapPin, Clock, Calendar, Trash2, Coins } from 'lucide-react';

interface ParkingHistoryProps {
  records: ParkingRecord[];
  onBack: () => void;
  onClear: () => void;
}

const ParkingHistory: React.FC<ParkingHistoryProps> = ({ records, onBack, onClear }) => {
  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}小时${mins}分钟`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-md mx-auto px-4 py-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">停车记录</h2>
        <div className="w-8"></div> {/* Spacer for centering */}
      </div>

      {/* List */}
      <div className="space-y-4 flex-1">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 space-y-4">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-sm">暂无停车记录</p>
          </div>
        ) : (
          records.slice().reverse().map((record) => (
            <div key={record.id} className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(record.startTime)}
                 </div>
                 {/* Cost Display - New */}
                 <div className="flex items-center gap-1.5">
                   <div className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-100">
                      {record.costCycleCount}个周期
                   </div>
                   <div className="flex items-center text-brand-700 font-bold text-sm bg-brand-50/50 px-2 py-0.5 rounded-lg">
                      <span className="text-xs mr-0.5">¥</span>
                      {record.totalCost || 0}
                   </div>
                 </div>
               </div>
               
               <div className="flex items-start gap-3 mb-3">
                  <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-bold text-base leading-tight">
                        {record.locationName || "未记录地点"}
                    </h3>
                    {record.locationName ? (
                         <p className="text-slate-400 text-xs mt-1">已存档位置信息</p>
                    ) : (
                         <p className="text-slate-400 text-xs mt-1 italic">无详细位置描述</p>
                    )}
                  </div>
               </div>

               <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 停车时长
                  </span>
                  <div className="flex items-center gap-3">
                     {record.cycleCost && (
                       <span className="text-[10px] text-slate-400">
                         (¥{record.cycleCost}/周期)
                       </span>
                     )}
                     <span className="font-mono font-bold text-slate-700">{formatDuration(record.totalDurationMs)}</span>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Clear Action */}
      {records.length > 0 && (
        <div className="mt-8 text-center">
            <button 
                onClick={() => {
                    if(confirm('确定要清空所有历史记录吗？')) {
                        onClear();
                    }
                }}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
                <Trash2 className="w-3.5 h-3.5" /> 清空历史记录
            </button>
        </div>
      )}
    </div>
  );
};

export default ParkingHistory;
