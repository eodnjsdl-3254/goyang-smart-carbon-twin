// src/features/green-space/components/panel/GreenerySimPanel.tsx
import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useGreeneryController } from '../../hooks/controller/useGreeneryController';
import { GreeneryControlTab } from './GreeneryControlTab';
import { GreeneryStatsTab } from './GreeneryStatsTab';

export const GreenerySimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ctrl = useGreeneryController();

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)} 
      className="absolute top-20 left-4 z-20 bg-zinc-900/90 text-white px-4 py-2 rounded-full shadow-2xl font-bold border border-white/10 backdrop-blur-md text-xs hover:bg-zinc-800 flex items-center gap-2"
    >
      <span>🌿</span> 녹지 시뮬레이션
    </button>
  );

  return (
    <div className="absolute top-20 left-4 z-20">
      <OverlayCard 
        title="🌿 녹지 조성 시뮬레이션" 
        onClose={() => { setIsOpen(false); ctrl.resetAll(); }} 
        className="w-80 shadow-2xl border-t-4 border-green-500 bg-zinc-950/95 backdrop-blur-xl text-white"
      >
        <div className="space-y-4 p-1">
          {/* 1. 그리기 버튼 (메인에 유지) */}
          <button 
            onClick={ctrl.toggleDrawing} 
            className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all ${
              ctrl.isDrawing 
                ? 'bg-red-600/80 animate-pulse hover:bg-red-500' 
                : 'bg-blue-600/80 hover:bg-blue-500'
            }`}
          >
            {ctrl.isDrawing ? "🛑 그리기 취소" : "📐 영역 그리기"}
          </button>

          {/* 2. 통계 탭 (면적, 모델정보 등) */}
          <GreeneryStatsTab />

          {/* 3. 제어 탭 (영역이 그려졌을 때만 표시) - 원본의 safeArea > 0 조건 대응 */}
          {ctrl.hasDrawing ? (
             <GreeneryControlTab />
          ) : (
            // 영역 없을 때 안내 문구
            !ctrl.isDrawing && (
              <div className="py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                 <p className="text-zinc-500 text-xs">지도를 클릭하여<br/>녹지 영역을 설정하세요.</p>
              </div>
            )
          )}
        </div>
      </OverlayCard>
    </div>
  );
};