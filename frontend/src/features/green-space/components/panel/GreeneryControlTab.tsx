import React from 'react';
import { useGreeneryController } from '../../hooks/controller/useGreeneryController';

export const GreeneryControlTab: React.FC = () => {
  const { settings, setSettings, stats, runSimulation, resetAll, isDrawing } = useGreeneryController();

  return (
    <div className="space-y-4 p-3 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-1">
      <div className="space-y-3">
        {/* 수종 비율 */}
        <div>
          <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5">
            <span>🌲 수종 비율 (침엽수/활엽수)</span>
            <span className="text-green-400">{Math.round(settings.coniferRatio * 100)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.1" 
            className="w-full accent-green-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
            value={settings.coniferRatio} 
            onChange={(e) => setSettings({ ...settings, coniferRatio: Number(e.target.value) })} 
          />
        </div>
        
        {/* 식재 밀도 */}
        <div>
          <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5">
            <span>🌳 식재 밀도</span>
            <span className="text-blue-400">{Math.round(settings.density * 100)}%</span>
          </div>
          <input 
            type="range" min="0.1" max="1" step="0.1" 
            className="w-full accent-blue-500 h-1 bg-zinc-700 rounded-lg cursor-pointer" 
            value={settings.density} 
            onChange={(e) => setSettings({ ...settings, density: Number(e.target.value) })} 
          />
        </div>
      </div>
      
      {/* 탄소 흡수량 */}
      <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg text-center">
        <p className="text-[10px] text-green-500 font-bold uppercase mb-1">연간 예상 탄소 흡수량</p>
        <p className="text-2xl font-black text-green-400">
          📉 {stats.carbon.toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg/yr</span>
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-1">
        <button 
          onClick={runSimulation} 
          disabled={isDrawing} 
          className="flex-[2] bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors shadow-lg"
        >
          배치 실행
        </button>
        <button 
          onClick={resetAll} 
          className="flex-[1] bg-zinc-800 text-zinc-400 py-2.5 rounded-lg font-bold text-xs hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
};