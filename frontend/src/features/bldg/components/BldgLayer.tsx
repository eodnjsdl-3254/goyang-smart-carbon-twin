import React from 'react';
import { Entity, PointGraphics } from 'resium';
import { Cartesian3, Color } from 'cesium';

export const BldgLayer: React.FC = () => {
  // 예시: 고양시청 좌표에 포인트 찍기
  const position = Cartesian3.fromDegrees(126.832, 37.658, 100);

  return (
    <Entity
      position={position}
      name="고양시청 (테스트 건물)"
      description="Feature-based Architecture Test Point"
    >
      <PointGraphics pixelSize={20} color={Color.RED} outlineColor={Color.WHITE} outlineWidth={2} />
    </Entity>
  );
};