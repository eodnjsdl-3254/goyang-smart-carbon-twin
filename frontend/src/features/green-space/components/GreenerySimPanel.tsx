import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useGreeneryContext } from '../context/GreeneryContext';

export const GreenerySimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isDrawing, setIsDrawing, settings, setSettings, 
    estimatedCarbon, generateTrees, reset,
    polygonArea, maxCapacity, treeModels, trees 
  } = useGreeneryContext();

  const safeArea = polygonArea || 0;
  const safeMax = maxCapacity || 0;
  const displayCount = trees.length > 0 ? trees.length : Math.floor(safeMax * settings.density);

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="absolute top-20 left-4 z-20 bg-zinc-900/90 text-white px-4 py-2 rounded-full shadow-2xl font-bold border border-white/10 backdrop-blur-md text-xs hover:bg-zinc-800 flex items-center gap-2">
      <span>🌿</span> 녹지 시뮬레이션
    </button>
  );

  return (
    <div className="absolute top-20 left-4 z-20">
      <OverlayCard title="🌿 녹지 조성 시뮬레이션" onClose={() => { setIsOpen(false); reset(); }} className="w-80 shadow-2xl border-t-4 border-green-500 bg-zinc-950/95 backdrop-blur-xl text-white">
        <div className="space-y-4 p-1">
          <button onClick={() => isDrawing ? reset() : setIsDrawing(true)} className={`w-full py-2.5 rounded-lg font-bold text-xs ${isDrawing ? 'bg-red-600/80 animate-pulse' : 'bg-blue-600/80'}`}>
            {isDrawing ? "🛑 그리기 취소" : "📐 영역 그리기"}
          </button>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white/5 p-2.5 rounded-lg text-center border border-white/10">
              <p className="text-zinc-500 font-bold mb-1 uppercase tracking-tighter">대상지 면적</p>
              <p className="text-sm font-black text-orange-400">{safeArea > 0 ? `${Math.round(safeArea).toLocaleString()} m²` : "-"}</p>
            </div>
            <div className="bg-white/5 p-2.5 rounded-lg text-center border border-white/10">
              <p className="text-zinc-500 font-bold mb-1 uppercase tracking-tighter">식재 수량</p>
              <p className="text-sm font-black text-blue-400">{safeArea > 0 ? `${displayCount.toLocaleString()} 그루` : "-"}</p>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">모델 실측 정보</span>
              <span className={treeModels.conifer.loaded ? "text-green-400" : "text-yellow-500"}>{treeModels.conifer.loaded ? "✅ 완료" : "⚠️ 기본값"}</span>
            </div>
            <p className="flex justify-between border-t border-white/5 pt-1 mt-1">
              <span>🌲 침엽수: {(treeModels.conifer.width * treeModels.conifer.depth).toFixed(1)}m² (폭 {treeModels.conifer.width}m)</span>
              <span>🌳 활엽수: {(treeModels.deciduous.width * treeModels.deciduous.depth).toFixed(1)}m² (폭 {treeModels.deciduous.width}m)</span>
            </p>
          </div>

          {safeArea > 0 ? (
            <div className="space-y-4 p-3 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5"><span>🌲 수종 비율</span><span className="text-green-400">{Math.round(settings.coniferRatio * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.1" className="w-full accent-green-500" value={settings.coniferRatio} onChange={(e) => setSettings({ ...settings, coniferRatio: Number(e.target.value) })} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5"><span>🌳 식재 밀도</span><span className="text-blue-400">{Math.round(settings.density * 100)}%</span></div>
                  <input type="range" min="0.1" max="1" step="0.1" className="w-full accent-blue-500" value={settings.density} onChange={(e) => setSettings({ ...settings, density: Number(e.target.value) })} />
                </div>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-center">
                <p className="text-[10px] text-green-500 font-bold uppercase mb-1">연간 예상 탄소 흡수량</p>
                <p className="text-2xl font-black text-green-400">📉 {estimatedCarbon.toLocaleString()} <span className="text-xs font-normal">kg/yr</span></p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={generateTrees} disabled={isDrawing} className="flex-[2] bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-600 disabled:opacity-50">배치 실행</button>
                <button onClick={reset} className="flex-[1] bg-zinc-800 text-zinc-400 py-2.5 rounded-lg font-bold text-xs">초기화</button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center bg-black/30 rounded-xl border border-dashed border-zinc-800">
               <p className="text-zinc-500 text-xs leading-relaxed">지도를 클릭하여<br/>시뮬레이션 영역을 그리세요.</p>
            </div>
          )}
        </div>
      </OverlayCard>
    </div>
  );
};