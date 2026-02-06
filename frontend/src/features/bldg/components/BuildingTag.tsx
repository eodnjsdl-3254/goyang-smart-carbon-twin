import React, { useEffect, useRef, useState } from 'react';
import { useCesium } from 'resium';
import { Cartesian3, SceneTransforms } from 'cesium';
import type { BuildingProps } from '../types';

interface Props {
  building: BuildingProps | null;
  onUpdate: (updates: Partial<BuildingProps>) => void;
}

export const BuildingTag: React.FC<Props> = ({ building, onUpdate }) => {
  const { viewer } = useCesium();
  const tagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewer || !building || !tagRef.current) return;

    const updatePosition = () => {
    const worldPos = Cartesian3.fromDegrees(building.lon, building.lat, building.height);
    
    // 최신 버전 명칭인 worldToWindowCoordinates를 우선 사용하고 타입 가드를 적용합니다.
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
  }, [viewer, building]);

  if (!building) return null;

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
          className="w-12 bg-gray-800 border-none text-[10px] p-0.5 rounded text-right"
          value={building.height}
          onChange={(e) => onUpdate({ height: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};