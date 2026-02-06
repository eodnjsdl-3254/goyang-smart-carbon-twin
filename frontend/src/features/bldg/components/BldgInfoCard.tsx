import React from 'react';
import { OverlayCard } from '@/components/ui';
import { useBldgContext } from '../context/BldgContext';

export const BldgInfoCard: React.FC = () => {
  // 전역 컨텍스트에서 상태와 제어 함수를 가져옵니다.
  const { selectedBldg, selectBldg } = useBldgContext();
  
  if (!selectedBldg) return null;

  return (
    <div className="absolute top-20 right-4 z-20">
      <OverlayCard 
        title="🏢 건물 상세 정보" 
        onClose={() => selectBldg(null)} 
        className="w-72 shadow-2xl"
      >
        <div className="space-y-3 text-sm">
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase">ID</p>
            <p className="font-mono text-xs">{selectedBldg.id.split('-')[0]}...</p>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 p-1 rounded">
              <p className="text-[9px] text-blue-400 font-bold">W</p>
              <p className="font-bold text-blue-700">{selectedBldg.width}m</p>
            </div>
            <div className="bg-blue-50 p-1 rounded">
              <p className="text-[9px] text-blue-400 font-bold">D</p>
              <p className="font-bold text-blue-700">{selectedBldg.depth}m</p>
            </div>
            <div className="bg-blue-50 p-1 rounded">
              <p className="text-[9px] text-blue-400 font-bold">H</p>
              <p className="font-bold text-blue-700">{selectedBldg.height}m</p>
            </div>
          </div>

          <div className="pt-2 border-t border-dashed">
            <p className="text-xs text-gray-500 font-medium">
              이 위치의 예상 연간 탄소 흡수량: 
              <span className="text-green-600 font-bold ml-1">
                {/* 레거시 로직에 기반한 탄소 흡수량 계산 */}
                {Math.round(selectedBldg.width * selectedBldg.depth * 0.5)} kg
              </span>
            </p>
          </div>
        </div>
      </OverlayCard>
    </div>
  );
};