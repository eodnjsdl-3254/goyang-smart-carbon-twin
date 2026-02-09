import React, { useEffect, useState } from 'react';
import { useCesium, Entity, PolygonGraphics, ModelGraphics, PointGraphics, PolylineGraphics } from 'resium';
import { 
  Color, HeightReference, ClassificationType, ScreenSpaceEventHandler, 
  ScreenSpaceEventType, Cartesian2, ImageMaterialProperty, Cartesian3, 
  CallbackProperty, PolygonHierarchy, ShadowMode
} from 'cesium';
import { useGreeneryContext } from '../context/GreeneryContext';

export const GreeneryLayer: React.FC = () => {
  const { viewer } = useCesium();
  const { trees, drawingPoints, setDrawingPoints, isDrawing, setIsDrawing, generateTrees } = useGreeneryContext();
  const [mousePos, setMousePos] = useState<Cartesian3 | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    if (isDrawing) {
      // 🚫 기본 더블클릭 동작 제거
      viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      
      handler.setInputAction((click: any) => {
        const pos = viewer.scene.pickPosition(click.position) || viewer.camera.pickEllipsoid(click.position);
        if (pos) setDrawingPoints(prev => [...prev, pos]);
      }, ScreenSpaceEventType.LEFT_CLICK);

      handler.setInputAction((move: any) => {
        const pos = viewer.scene.pickPosition(move.endPosition) || viewer.camera.pickEllipsoid(move.endPosition);
        if (pos) setMousePos(pos);
      }, ScreenSpaceEventType.MOUSE_MOVE);

      handler.setInputAction(() => {
        // 💡 상태 변경만 수행 (나무 생성은 아래 useEffect에서 처리)
        setIsDrawing(false); 
      }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    return () => { handler.destroy(); };
  }, [viewer, isDrawing, setDrawingPoints, setIsDrawing]);

  // 💡 중요: 그리기 상태가 'isDrawing: false'로 커밋된 직후 최신 점들로 나무 생성
  useEffect(() => {
    if (!isDrawing && drawingPoints.length >= 3 && trees.length === 0) {
      generateTrees();
      setMousePos(null);
    }
  }, [isDrawing, drawingPoints, generateTrees, trees.length]);

  const linePositions = new CallbackProperty(() => {
    return mousePos && isDrawing ? [...drawingPoints, mousePos] : drawingPoints;
  }, false);

  const createDualMaterial = (imagePath: string, isMain: boolean) => {
    return new ImageMaterialProperty({
      image: imagePath,
      transparent: true,
      repeat: new Cartesian2(20, 20),
      color: new CallbackProperty(() => {
        if (!viewer) return Color.WHITE;
        const height = viewer.camera.positionCartographic.height;
        const alpha = height < 300 ? (height / 300) : 1.0;
        return Color.WHITE.withAlpha(isMain ? 0.8 * alpha : 0.4 * alpha);
      }, false)
    });
  };

  return (
    <>
      {/* 드로잉 포인트 */}
      {drawingPoints.map((pos, i) => (
        <Entity key={`pt-${i}`} position={pos}>
          <PointGraphics pixelSize={8} color={Color.RED} heightReference={HeightReference.CLAMP_TO_GROUND} />
        </Entity>
      ))}

      {/* 노란색 가이드 라인 */}
      {isDrawing && drawingPoints.length > 0 && (
        <Entity>
          <PolylineGraphics positions={linePositions} width={3} material={Color.YELLOW} clampToGround={true} />
        </Entity>
      )}

      {/* 녹지 영역 폴리곤 (ID 통일: greenery-poly) */}
      {!isDrawing && drawingPoints.length >= 3 && (
        <>
          <Entity id="greenery-poly">
            <PolygonGraphics 
              hierarchy={new PolygonHierarchy(drawingPoints)} 
              material={createDualMaterial("/green/texture1.png", true)} 
              classificationType={ClassificationType.BOTH}
            />
          </Entity>
          <Entity>
            <PolygonGraphics 
              hierarchy={new PolygonHierarchy(drawingPoints)} 
              material={createDualMaterial("/green/texture2.png", false)} 
              classificationType={ClassificationType.BOTH}
            />
          </Entity>
        </>
      )}

      {/* 나무 모델 렌더링 */}
      {trees.map((tree) => (
        <Entity key={tree.id} position={tree.position} orientation={tree.orientation}>
          <ModelGraphics
            uri={tree.modelUrl}
            scale={tree.scale}
            heightReference={HeightReference.CLAMP_TO_GROUND}
            shadows={ShadowMode.ENABLED}
          />
        </Entity>
      ))}
    </>
  );
};