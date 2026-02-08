import React from 'react';
import { OverlayCard } from '@/components/ui';
import { useBldgContext } from '../context/BldgContext';

export const BldgInfoCard: React.FC = () => {
  const { selectedBuilding, setSelectedBuildingId } = useBldgContext();
  
  if (!selectedBuilding) return null;

  // 실제 화면 크기 계산 함수
  const calculateDim = (original: number | undefined, scale: number | undefined, fallback: number) => {
    if (!selectedBuilding.isModel) return (fallback || 0).toFixed(1);
    if (original === undefined) return "..."; 
    // LAY_CONFIG.MODEL_FIX를 1.0으로 맞췄으므로 배율만 곱합니다.
    return (original * (scale ?? 1)).toFixed(1);
  };

  return (
    <div className="absolute top-20 right-4 z-20">
      <OverlayCard 
        title="🏢 건물 상세 정보" 
        onClose={() => setSelectedBuildingId(null)} 
        className="w-72 shadow-2xl"
      >
        <div className="space-y-3 text-sm">
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Name</p>
            <p className="font-bold text-gray-800 text-sm">{selectedBuilding.name || "Unknown Building"}</p>
            <p className="text-[9px] text-gray-400 mt-1 font-mono">{selectedBuilding.id}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 p-1 rounded">
              <p className="text-[9px] text-blue-400 font-bold">W (m)</p>
              <p className="font-bold text-blue-700">
                {calculateDim(selectedBuilding.originalWidth, selectedBuilding.scaleX, selectedBuilding.width)}
              </p>
            </div>
            <div className="bg-blue-50 p-1 rounded">
              <p className="text-[9px] text-blue-400 font-bold">D (m)</p>
              <p className="font-bold text-blue-700">
                {calculateDim(selectedBuilding.originalDepth, selectedBuilding.scaleY, selectedBuilding.depth)}
              </p>
            </div>
            <div className="bg-blue-50 p-1 rounded">
              <p className="text-[9px] text-blue-400 font-bold">H (m)</p>
              <p className="font-bold text-blue-700">
                {calculateDim(selectedBuilding.originalHeight, selectedBuilding.scaleZ, selectedBuilding.height)}
              </p>
            </div>
          </div>

          {selectedBuilding.isModel && selectedBuilding.originalHeight !== undefined && (
             <div className="text-[10px] text-gray-400 text-center border-t border-dashed pt-2">
                Measured: {selectedBuilding.originalWidth}m x {selectedBuilding.originalDepth}m x {selectedBuilding.originalHeight}m
             </div>
          )}
        </div>
      </OverlayCard>
    </div>
  );
};