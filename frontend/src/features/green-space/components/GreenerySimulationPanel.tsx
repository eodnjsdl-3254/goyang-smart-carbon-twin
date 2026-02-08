import React, { useMemo, useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useGreeneryContext } from '../context/GreeneryContext';
import * as turf from '@turf/turf';
import { Cartographic, Math as CesiumMath } from 'cesium';

export const GreenerySimulationPanel: React.FC = () => {
  // 패널 열림/닫힘 상태 추가 (기본값 false)
  const [isOpen, setIsOpen] = useState(false);

  const { 
    isDrawing, setIsDrawing, trees, settings, setSettings, 
    estimatedCarbon, drawingPoints, generateTrees, reset 
  } = useGreeneryContext();

  const area = useMemo(() => {
    if (drawingPoints.length < 3) return 0;
    const coords = drawingPoints.map(p => {
      const carto = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(carto.longitude), CesiumMath.toDegrees(carto.latitude)];
    });
    coords.push(coords[0]);
    return Math.round(turf.area(turf.polygon([coords])));
  }, [drawingPoints]);

  // 🚨 [수정 2] 닫혀있을 때 플로팅 버튼 표시
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-20 left-4 z-20 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-green-700 transition-transform hover:scale-105 flex items-center gap-2 text-xs"
      >
        <span>🌿</span> 녹지 시뮬레이션
      </button>
    );
  }

  return (
    <div className="absolute top-20 left-4 z-20">
      <OverlayCard 
        title="🌿 녹지 조성 시뮬레이션" 
        onClose={() => { setIsOpen(false); setIsDrawing(false); }} 
        className="w-72 shadow-2xl border-t-4 border-green-500"
      >
        <div className="space-y-4">
          <button 
            onClick={() => setIsDrawing(!isDrawing)}
            className={`w-full py-2 rounded font-bold text-xs transition ${
              isDrawing ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isDrawing ? "🛑 그리기 취소" : "📐 영역 그리기 시작"}
          </button>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
              <p className="text-gray-400 uppercase font-bold mb-1">대상지 면적</p>
              <p className="text-sm font-bold text-orange-400">{area > 0 ? `${area.toLocaleString()} m²` : "-"}</p>
            </div>
            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
              <p className="text-gray-400 uppercase font-bold mb-1">식재 수량</p>
              <p className="text-sm font-bold text-green-400">{trees.length.toLocaleString()} 그루</p>
            </div>
          </div>

          {area > 0 && (
            <div className="space-y-3 p-3 bg-gray-50/5 rounded-lg border border-white/5 animate-in fade-in zoom-in-95">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-gray-300">
                  <span>🌲 침엽수 {Math.round(settings.coniferRatio * 100)}%</span>
                  <span>🌳 활엽수 {Math.round((1 - settings.coniferRatio) * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  value={settings.coniferRatio}
                  onChange={(e) => setSettings({ ...settings, coniferRatio: Number(e.target.value) })}
                />
                
                <label className="text-[10px] text-gray-400 font-bold block mt-2">🌳 식재 밀도 (Density)</label>
                <input 
                  type="range" min="0.1" max="1" step="0.1" 
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={settings.density}
                  onChange={(e) => setSettings({ ...settings, density: Number(e.target.value) })}
                />
              </div>
              
              <div className="bg-green-900/30 border border-green-500/30 p-3 rounded-lg text-center">
                <p className="text-[10px] text-green-400 font-bold uppercase mb-1">연간 예상 탄소 흡수량</p>
                <p className="text-xl font-black text-green-500">📉 {estimatedCarbon.toLocaleString()} kg</p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => generateTrees(drawingPoints)}
                  className="flex-[2] bg-green-600 text-white py-2 px-4 rounded font-bold text-sm hover:bg-green-700 transition shadow-lg"
                >
                  🌳 배치 실행
                </button>
                <button 
                  onClick={reset}
                  className="flex-[1] bg-gray-700 text-gray-300 py-2 px-2 rounded font-bold text-xs hover:bg-gray-600 transition"
                >
                  초기화
                </button>
              </div>
            </div>
          )}
        </div>
      </OverlayCard>
    </div>
  );
};