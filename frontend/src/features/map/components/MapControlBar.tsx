import React from 'react';
import { ControlPanel, IconButton } from '@/components/ui';
import { useMapContext } from '../context/MapContext';

export const MapControlBar: React.FC = () => {
  // 전역 상태와 함수를 가져옵니다.
  const { 
    currentBaseMap, setBaseMap, 
    showVWorld3D, setShowVWorld3D, 
    flyTo 
  } = useMapContext();

  return (
    <ControlPanel>
      {/* 🗺️ 레이어 선택: currentBaseMap 상태와 직접 연동 */}
      <select 
        value={currentBaseMap}
        onChange={(e) => setBaseMap(e.target.value as any)}
        className="p-1 text-sm rounded bg-white border outline-none cursor-pointer"
      >
        <option value="OSM">일반지도</option>
        <option value="Satellite">위성지도</option>
        <option value="Hybrid">하이브리드</option>
      </select>

      <div className="w-px h-4 bg-gray-300 mx-2"></div>

      {/* 🏢 3D 건물 토글: setShowVWorld3D 전역 함수 사용 */}
      <IconButton 
        onClick={() => setShowVWorld3D(!showVWorld3D)} 
        active={showVWorld3D}
        icon="🏢"
      >
        3D 건물
      </IconButton>

      {/* 📍 고양시 이동 */}
      <IconButton 
        onClick={() => flyTo(37.6583, 126.8322, 2000)} 
        icon="📍"
      >
        고양시
      </IconButton>
    </ControlPanel>
  );
};