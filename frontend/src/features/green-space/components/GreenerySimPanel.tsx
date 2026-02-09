import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useGreeneryContext } from '../context/GreeneryContext';

// [중요] 컴포넌트 이름을 파일명(GreenerySimPanel)과 똑같이 맞춰줍니다.
export const GreenerySimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Context에서 필요한 상태와 함수들을 가져옵니다.
  const { 
    isDrawing, setIsDrawing, settings, setSettings, 
    estimatedCarbon, generateTrees, reset,
    polygonArea, maxCapacity, treeModels 
  } = useGreeneryContext();

  // 현재 밀도에 따른 나무 개수 계산
  const currentCount = Math.floor(maxCapacity * settings.density);

  // 그리기 토글 핸들러
  const handleDrawerToggle = () => {
    if (isDrawing) {
      reset(); // 그리는 중이면 취소하고 초기화
    } else {
      setIsDrawing(true); // 아니면 그리기 시작
    }
  };

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
        onClose={() => { 
            setIsOpen(false); 
            if(isDrawing) reset(); 
        }} 
        className="w-80 shadow-2xl border-t-4 border-green-500"
      >
        <div className="space-y-4">
          <button 
            onClick={handleDrawerToggle}
            className={`w-full py-2 rounded font-bold text-xs transition ${
              isDrawing ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isDrawing ? "🛑 그리기 취소 (초기화)" : "📐 영역 그리기 (새로 만들기)"}
          </button>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
              <p className="text-gray-400 uppercase font-bold mb-1">대상지 면적</p>
              <p className="text-sm font-bold text-orange-400">{polygonArea > 0 ? `${polygonArea.toLocaleString()} m²` : "-"}</p>
            </div>
            <div className="bg-gray-800 p-2 rounded text-center border border-gray-700">
              <p className="text-gray-400 uppercase font-bold mb-1">최대 수용량</p>
              <p className="text-sm font-bold text-blue-400">{maxCapacity > 0 ? `${maxCapacity.toLocaleString()} 그루` : "-"}</p>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 text-right border-b border-dashed border-gray-200 pb-1">
             {treeModels.conifer.loaded ? "✅ 모델 데이터 로드됨" : "⚠️ 기본값 사용 중"} <br/>
             🌲침엽수(폭): {treeModels.conifer.width}m | 🌳활엽수(폭): {treeModels.deciduous.width}m
          </div>

          {polygonArea > 0 && (
            <div className="space-y-3 p-3 bg-gray-50/5 rounded-lg border border-white/5 animate-in fade-in zoom-in-95">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold block">🌲 수종 비율 설정</label>
                <div className="flex justify-between text-[10px] text-gray-300 mb-1">
                  <span className="text-green-600 font-bold">침엽수 {Math.round(settings.coniferRatio * 100)}%</span>
                  <span className="text-orange-500 font-bold">활엽수 {Math.round((1 - settings.coniferRatio) * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  value={settings.coniferRatio}
                  onChange={(e) => setSettings({ ...settings, coniferRatio: Number(e.target.value) })}
                />
                
                <label className="text-[10px] text-gray-400 font-bold block mt-3">
                    🌳 식재 밀도 ({currentCount} 그루)
                </label>
                <input 
                  type="range" min="0.1" max="1" step="0.1" 
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={settings.density}
                  onChange={(e) => setSettings({ ...settings, density: Number(e.target.value) })}
                />
              </div>
              
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center mt-2">
                <p className="text-[10px] text-green-600 font-bold uppercase mb-1">연간 예상 탄소 흡수량</p>
                <p className="text-xl font-black text-green-700">📉 {estimatedCarbon.toLocaleString()} kg</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => generateTrees()}
                  className="flex-[2] bg-green-600 text-white py-2 px-4 rounded font-bold text-sm hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🌳</span> 배치 실행
                </button>
                <button 
                  onClick={reset}
                  className="flex-[1] bg-gray-100 text-gray-500 py-2 px-2 rounded font-bold text-xs hover:bg-gray-200 transition border border-gray-300"
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