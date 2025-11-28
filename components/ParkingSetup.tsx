import React, { useState, useRef } from 'react';
import { ParkingConfig } from '../types';
import { parseParkingRuleWithGemini } from '../services/geminiService';
import { Loader2, Sparkles, Camera, ArrowRight, Timer, History, MapPin, Coins, Bell, Plus, Minus, Check } from 'lucide-react';

interface ParkingSetupProps {
  onStart: (config: ParkingConfig) => void;
  onViewHistory: () => void;
}

const PRESETS = [
  { id: 'standard', name: '标准时租', desc: '1h/周期 · 15分免费', interval: 60, grace: 15 },
  { id: 'mall', name: '商场严格', desc: '1h/周期 · 无免费', interval: 60, grace: 0 },
  { id: 'roadside', name: '路边半小时', desc: '30分/周期 · 15分免费', interval: 30, grace: 15 },
  { id: 'quick', name: '短停快走', desc: '15分/周期 · 5分免费', interval: 15, grace: 5 },
];

const ParkingSetup: React.FC<ParkingSetupProps> = ({ onStart, onViewHistory }) => {
  const [interval, setInterval] = useState<number>(60);
  const [reminder, setReminder] = useState<number>(10);
  const [gracePeriod, setGracePeriod] = useState<number>(0);
  const [cycleCost, setCycleCost] = useState<number>(5);
  
  // Default start time to now
  const getNowString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  const [startTimeStr, setStartTimeStr] = useState<string>(getNowString());
  
  const [ruleText, setRuleText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Image & Location state
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStart = () => {
    const startTimestamp = new Date(startTimeStr).getTime();
    onStart({
      startTime: startTimestamp,
      intervalMinutes: interval,
      reminderMinutes: reminder,
      gracePeriodMinutes: gracePeriod,
      locationImage: locationImage || undefined,
      locationName: locationName || undefined,
      cycleCost: cycleCost,
    });
  };

  const handleAIAnalysis = async () => {
    if (!ruleText.trim()) return;
    setIsAnalyzing(true);
    setAiFeedback(null);
    
    const result = await parseParkingRuleWithGemini(ruleText);
    
    setIsAnalyzing(false);
    if (result) {
      setInterval(result.intervalMinutes);
      setGracePeriod(result.gracePeriodMinutes);
      setAiFeedback(`已自动识别: ${result.explanation}`);
    } else {
      setAiFeedback("无法识别规则，请手动设置");
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setInterval(preset.interval);
    setGracePeriod(preset.grace);
    if (aiFeedback) setAiFeedback(null);
  };

  const adjustCost = (delta: number) => {
    setCycleCost(prev => Math.max(0, Math.min(200, prev + delta)));
  };

  const adjustReminder = (delta: number) => {
    setReminder(prev => Math.max(1, Math.min(59, prev + delta)));
  };

  const handleReminderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 0;
    if (val > 59) val = 59;
    setReminder(val);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize < 1) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setLocationImage(compressedDataUrl);
        }
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 w-full max-w-md mx-auto animate-slide-up pb-10">
      
      {/* Top Bar with History Button */}
      <div className="w-full flex justify-end mb-2">
        <button 
          onClick={onViewHistory}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-brand-700 text-sm font-semibold shadow-sm border border-brand-100 hover:bg-brand-50 active:scale-95 transition-all"
        >
          <History className="w-4 h-4" />
          历史记录
        </button>
      </div>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-brand-300 rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-brand-300 to-brand-500 w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-100">
            <Timer className="w-9 h-9 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">挪车宝</h1>
        <p className="text-slate-500 text-sm mt-1">智能停车计时助手</p>
      </div>

      {/* Main Card */}
      <div className="w-full bg-white rounded-3xl p-6 border border-brand-100/50 shadow-[0_20px_40px_-15px_rgba(230,126,91,0.1)] space-y-7">
        
        {/* Step 1: Start Time */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">1</span>
            什么时候停的车？
          </label>
          <input 
            type="datetime-local" 
            value={startTimeStr}
            onChange={(e) => setStartTimeStr(e.target.value)}
            className="w-full bg-brand-50 hover:bg-white border border-brand-200/50 rounded-xl px-4 py-4 text-xl text-slate-800 font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer appearance-none"
          />
        </div>

        {/* Step 2: Billing Rules */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
             <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
               <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">2</span>
               计费规则设置
             </label>
             
             {/* Cost Stepper Input */}
             <div className="flex items-center bg-brand-50 rounded-lg border border-brand-100 overflow-hidden">
                <div className="flex items-center px-2 py-1.5 border-r border-brand-100">
                    <Coins className="w-3.5 h-3.5 text-brand-500" />
                </div>
                <button 
                    onClick={() => adjustCost(-1)}
                    className="w-8 h-8 flex items-center justify-center text-brand-600 active:bg-brand-100"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="w-10 text-center font-bold text-brand-800 text-sm">
                    {cycleCost}<span className="text-[10px] ml-0.5">元</span>
                </div>
                <button 
                    onClick={() => adjustCost(1)}
                    className="w-8 h-8 flex items-center justify-center text-brand-600 active:bg-brand-100"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
             </div>
           </div>
           
           {/* 2A: Presets Grid */}
           <div className="grid grid-cols-2 gap-3">
              {PRESETS.map(preset => {
                const isActive = interval === preset.interval && gracePeriod === preset.grace;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`
                      relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 active:scale-95 touch-manipulation
                      ${isActive 
                        ? 'bg-brand-50 border-brand-500 shadow-sm ring-1 ring-brand-500/20' 
                        : 'bg-white border-brand-100 hover:border-brand-300 text-slate-600'
                      }
                    `}
                  >
                    {isActive && <div className="absolute top-2 right-2 text-brand-600"><Check className="w-3.5 h-3.5" /></div>}
                    <span className={`text-sm font-bold ${isActive ? 'text-brand-700' : 'text-slate-700'}`}>{preset.name}</span>
                    <span className={`text-[10px] mt-0.5 ${isActive ? 'text-brand-600/80' : 'text-slate-400'}`}>{preset.desc}</span>
                  </button>
                )
              })}
           </div>

           {/* 2B: Divider */}
           <div className="relative py-2">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
             <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">或自定义</span></div>
           </div>

           {/* 2C: Manual Fine-tuning Buttons */}
           <div className="grid grid-cols-3 gap-3">
              {[30, 60, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => setInterval(m)}
                  className={`py-3 rounded-xl font-medium text-xs transition-all duration-200 border active:scale-95 ${
                    interval === m 
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20' 
                      : 'bg-brand-50 text-slate-500 border-brand-100'
                  }`}
                >
                  {m === 60 ? '1小时/周期' : `${m}分钟/周期`}
                </button>
              ))}
           </div>
           
           {/* 2D: AI Input */}
           <div className="relative group">
              <textarea
                placeholder="或者输入规则，例如：每1小时5元，前15分钟免费"
                value={ruleText}
                onChange={(e) => setRuleText(e.target.value)}
                enterKeyHint="done"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none h-14 placeholder:text-slate-400 transition-all focus:h-20"
              />
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing || !ruleText}
                className={`
                  absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95
                  ${!ruleText 
                    ? 'bg-slate-100 text-slate-300' 
                    : 'bg-[#fff5eb] text-brand-600 border border-brand-200'
                  }
                `}
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isAnalyzing ? '分析中' : 'AI识别'}
              </button>
           </div>
            
           {(aiFeedback || gracePeriod > 0) && (
             <div className="flex flex-wrap gap-2 text-xs">
                {aiFeedback && (
                  <span className="text-brand-800 bg-brand-100/50 px-2 py-1 rounded border border-brand-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {aiFeedback}
                  </span>
                )}
                {gracePeriod > 0 && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1">
                     <Check className="w-3 h-3" /> 含{gracePeriod}分钟免费
                  </span>
                )}
             </div>
           )}
        </div>

        {/* Step 3: Reminder Setting */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">3</span>
            提前多久提醒？
          </label>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                onClick={() => setReminder(m)}
                className={`
                  flex-1 min-w-[70px] py-3 rounded-xl font-medium text-sm transition-all duration-200 border active:scale-95
                  ${reminder === m
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                    : 'bg-brand-50 text-slate-600 border-brand-100'
                  }
                `}
              >
                {m}分
              </button>
            ))}
            
            {/* Custom Reminder Stepper */}
            <div className={`flex-[1.5] flex items-center rounded-xl border transition-all duration-200 bg-brand-50 ${![5,10,15].includes(reminder) ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-brand-100'}`}>
               <button onClick={() => adjustReminder(-1)} className="p-2.5 text-slate-500 active:bg-brand-100 rounded-l-xl">
                 <Minus className="w-4 h-4" />
               </button>
               
               <div className="flex-1 flex items-center justify-center relative">
                  <input 
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={reminder}
                    onChange={handleReminderChange}
                    className="w-full text-center bg-transparent text-sm font-bold text-slate-700 outline-none py-2.5 px-1"
                  />
                  <span className="absolute right-0 text-xs text-slate-400 pointer-events-none">分</span>
               </div>
               
               <button onClick={() => adjustReminder(1)} className="p-2.5 text-slate-500 active:bg-brand-100 rounded-r-xl">
                 <Plus className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>

        {/* Step 4: Location Info */}
        <div className="space-y-3">
           <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">4</span>
                停车位置 <span className="text-slate-400 font-normal text-xs">(可选)</span>
             </div>
             {locationImage && (
               <button onClick={() => setLocationImage(null)} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-medium active:scale-95">
                 删除照片
               </button>
             )}
           </label>
           
           <div className="relative">
             <div className="absolute top-3.5 left-3.5 text-slate-400">
               <MapPin className="w-4 h-4" />
             </div>
             <input 
               type="text" 
               enterKeyHint="done"
               placeholder="例如：万象城 B2 F区 088"
               value={locationName}
               onChange={(e) => setLocationName(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-base text-slate-800 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder:text-slate-400 transition-all mb-2"
             />
           </div>
           
           {!locationImage ? (
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="w-full group relative bg-brand-50 border-2 border-dashed border-brand-200 rounded-xl p-4 flex flex-row items-center justify-center gap-3 transition-all hover:bg-white active:scale-[0.98] active:bg-brand-50/50"
             >
               <div className="bg-white p-2.5 rounded-full shadow-sm border border-brand-100 group-hover:scale-110 transition-transform duration-300">
                  <Camera className="w-5 h-5 text-brand-300 group-hover:text-brand-500" />
               </div>
               <span className="text-sm text-brand-400 group-hover:text-brand-600 font-medium">拍张照更稳妥</span>
             </button>
           ) : (
             <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-brand-200 shadow-md group cursor-pointer active:scale-[0.98] transition-transform" onClick={() => fileInputRef.current?.click()}>
               <img src={locationImage} alt="Parking location" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-brand-900/10 flex items-center justify-center">
                  <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
                     <Camera className="w-3.5 h-3.5" /> 点击重拍
                  </span>
               </div>
             </div>
           )}
           <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* Action Button */}
        <div className="pt-2 sticky bottom-2 z-10">
          <button
            onClick={handleStart}
            className="group w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-[#e67e5b] to-[#d45b3a] p-[1px] shadow-lg shadow-brand-600/30 transition-all duration-300 active:scale-95 active:shadow-none"
          >
            <div className="relative flex items-center justify-center gap-2 rounded-xl bg-transparent py-4 px-6 text-white transition-all">
              <span className="text-lg font-bold tracking-wide">开始倒计时</span>
              <ArrowRight className="w-5 h-5" />
            </div>
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-[#f9e0b1]/30 to-transparent z-10" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParkingSetup;