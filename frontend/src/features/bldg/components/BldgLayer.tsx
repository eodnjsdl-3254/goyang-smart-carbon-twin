import React from 'react';
import { Entity, Model, BoxGraphics } from 'resium';
import { Cartesian3, Color, Transforms, HeadingPitchRoll, Math as CesiumMath } from 'cesium';
import type { BuildingProps } from '../types';

interface Props {
  buildings: BuildingProps[];
}

export const BldgLayer: React.FC<Props> = ({ buildings }) => {
  return (
    <>
      {/* buildings가 있을 때만 실행되도록 ?. 추가 */}
      {buildings?.map((b) => {
        // Cesium은 중심점을 기준으로 배치하므로 지면에 붙이기 위해 높이의 절반($h/2$)을 적용합니다.
        const position = Cartesian3.fromDegrees(b.lon, b.lat, b.height / 2); 
        const orientation = Transforms.headingPitchRollQuaternion(
          position,
          new HeadingPitchRoll(CesiumMath.toRadians(b.rotation), 0, 0)
        );

        return (
          <Entity key={b.id} position={position} orientation={orientation}>
            {b.isModel && b.modelUrl ? (
              <Model url={b.modelUrl} scale={b.scale} />
            ) : (
              <BoxGraphics 
                dimensions={new Cartesian3(b.width, b.depth, b.height)} 
                material={Color.WHITE.withAlpha(0.8)}
                outline={true}
                outlineColor={Color.BLACK}
              />
            )}
          </Entity>
        );
      })}
    </>
  );
};