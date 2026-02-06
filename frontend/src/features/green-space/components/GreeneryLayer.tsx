import React from 'react';
import { Entity, BillboardGraphics, PolygonGraphics } from 'resium';
import { Color, HeightReference, VerticalOrigin, ClassificationType, Cartesian3 } from 'cesium';
import type { TreeItem } from '../hooks/useGreenery';

interface Props {
  trees: TreeItem[];
  drawingPoints: Cartesian3[];
}

export const GreeneryLayer: React.FC<Props> = ({ trees, drawingPoints }) => {
  return (
    <>
      {drawingPoints.length >= 3 && (
        <Entity>
          <PolygonGraphics
            hierarchy={drawingPoints}
            material={Color.FORESTGREEN.withAlpha(0.4)}
            classificationType={ClassificationType.BOTH}
          />
        </Entity>
      )}

      {trees.map((tree, i) => (
        <Entity key={`tree-${i}`} position={tree.position}>
          <BillboardGraphics
            image={tree.type === 'CONIFER' ? "/assets/tree_conifer.png" : "/assets/tree_deciduous.png"}
            width={24}
            height={24}
            heightReference={HeightReference.CLAMP_TO_GROUND}
            verticalOrigin={VerticalOrigin.BOTTOM}
          />
        </Entity>
      ))}
    </>
  );
};