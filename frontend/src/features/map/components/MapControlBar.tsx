// src/features/map/components/MapControlBar.tsx
import React, { useState } from 'react';
import { ControlPanel, IconButton } from '@/components/ui';
import { useMapControl } from '../hooks/useMapControl';
import { useVWorld3DTiles } from '../hooks/useVWorld3DTiles'; // 3D 훅
import { VWorldImagery } from './VWorldImagery'; // 2D 컴포넌트

export const MapControlBar: React.FC = () => {
  const { flyToGoyang } = useMapControl();
  
  // 상태 관리
  const [showVWorld3D, setShowVWorld3D] = useState(false);
  const [layerType, setLayerType] = useState<'Base' | 'Satellite' | 'Hybrid'>('Base');

  // 3D 훅 실행 (visible 상태에 따라 로드/숨김 처리)
  useVWorld3DTiles(showVWorld3D);

  return (
    <>
      {/* 2D 레이어는 선언적으로 렌더링 */}
      <VWorldImagery type={layerType} visible={true} />

      <ControlPanel>
        {/* 레이어 선택 */}
        <select 
          value={layerType}
          onChange={(e) => setLayerType(e.target.value as any)}
          className="p-1 text-sm rounded bg-white border"
        >
          <option value="Base">일반지도</option>
          <option value="Satellite">위성지도</option>
          <option value="Hybrid">하이브리드</option>
        </select>

        <div className="w-px h-4 bg-gray-300 mx-2"></div>

        {/* 3D 건물 토글 */}
        <IconButton 
          onClick={() => setShowVWorld3D(!showVWorld3D)} 
          active={showVWorld3D}
          icon="🏢"
        >
          3D 건물
        </IconButton>

        <IconButton onClick={flyToGoyang} icon="📍">고양시</IconButton>
      </ControlPanel>
    </>
  );
};