// src/features/bldg/components/overlay/BuildingTag.tsx
import React, { useEffect, useRef } from 'react'; // useState 제거됨
import { useCesium } from 'resium';
import { Cartesian3, SceneTransforms } from 'cesium';
// [수정] Context import 추가
import { useBldgContext } from '../../context/BldgContext';

// [수정] Props 인터페이스 제거 (더 이상 외부에서 받지 않음)

export const BuildingTag: React.FC = () => {
  const { viewer } = useCesium();
  // [수정] Context에서 선택된 건물과 수정 함수 가져오기
  const { selectedBuilding, updateBuilding } = useBldgContext();
  
  const tagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // selectedBuilding이 없으면 실행하지 않음
    if (!viewer || !selectedBuilding || !tagRef.current) return;

    const updatePosition = () => {
      // 선택된 건물의 위치(lon, lat)와 현재 높이(height)로 3D 좌표 계산
      const worldPos = Cartesian3.fromDegrees(
        selectedBuilding.lon, 
        selectedBuilding.lat, 
        selectedBuilding.height
      );
      
      const sceneTransforms = SceneTransforms as any;
      const canvasPos = (sceneTransforms.worldToWindowCoordinates || sceneTransforms.wgs84ToWindowCoordinates)(
          viewer.scene, 
          worldPos
      );

      if (canvasPos && tagRef.current) {
          tagRef.current.style.transform = `translate(${canvasPos.x + 60}px, ${canvasPos.y + 60}px)`;
          tagRef.current.style.display = 'block';
      } else if (tagRef.current) {
          tagRef.current.style.display = 'none';
      }
    };

    // Cesium 렌더링 루프에 위치 업데이트 등록
    const removeListener = viewer.scene.postRender.addEventListener(updatePosition);
    return () => removeListener();
  }, [viewer, selectedBuilding]); // 의존성에 selectedBuilding 추가

  // 선택된 건물이 없으면 태그를 렌더링하지 않음
  if (!selectedBuilding) return null;

  return (
    <div 
      ref={tagRef}
      className="absolute top-0 left-0 z-30 bg-black/80 text-white p-2 rounded shadow-xl border border-white/20 pointer-events-auto"
      style={{ display: 'none' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-green-400 font-bold">📏 정밀 편집</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 items-center">
        <span className="text-[9px] text-gray-400 uppercase">Height</span>
        <input 
          type="number" 
          className="w-12 bg-gray-800 border-none text-[10px] p-0.5 rounded text-right text-white outline-none focus:ring-1 focus:ring-green-500"
          // [수정] Context 데이터 사용
          value={selectedBuilding.height || 0}
          onChange={(e) => updateBuilding(selectedBuilding.id, { height: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};