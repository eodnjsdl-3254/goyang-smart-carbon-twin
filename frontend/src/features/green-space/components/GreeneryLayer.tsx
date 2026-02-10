import React, { useEffect, useState, useRef } from 'react';
import { useCesium, Entity, PolygonGraphics, ModelGraphics, PointGraphics, PolylineGraphics } from 'resium';
import { 
  Color, HeightReference, ClassificationType, ScreenSpaceEventHandler, 
  ScreenSpaceEventType, Cartesian2, ImageMaterialProperty, Cartesian3, 
  CallbackProperty, PolygonHierarchy, ShadowMode, DistanceDisplayCondition
} from 'cesium';
import { useGreeneryContext } from '../context/GreeneryContext';

export const GreeneryLayer: React.FC = () => {
  const { viewer } = useCesium();
  const { 
    trees, drawingPoints, setDrawingPoints, 
    isDrawing, setIsDrawing, generateTrees 
  } = useGreeneryContext();
  
  const [mousePos, setMousePos] = useState<Cartesian3 | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

  // 1. 이벤트 핸들러 (그리기 로직)
  useEffect(() => {
    if (!viewer || !isDrawing) {
        if (handlerRef.current) {
            handlerRef.current.destroy();
            handlerRef.current = null;
        }
        return;
    }

    if (handlerRef.current) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;

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
        setIsDrawing(false);
        setMousePos(null);
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    return () => {
        if (handlerRef.current) {
            handlerRef.current.destroy();
            handlerRef.current = null;
        }
    };
  }, [viewer, isDrawing, setIsDrawing, setDrawingPoints]);

  // 2. 자동 생성 트리거
  useEffect(() => {
    if (!isDrawing && drawingPoints.length >= 3 && trees.length === 0) {
      console.log("🖱️ 그리기 종료 -> 나무 생성 시작");
      generateTrees();
    }
  }, [isDrawing, drawingPoints, trees.length, generateTrees]);

  const linePositions = new CallbackProperty(() => {
    return (isDrawing && mousePos && drawingPoints.length > 0) ? [...drawingPoints, mousePos] : drawingPoints;
  }, false);

  
  if (!viewer) return null;

  return (
    <>
      {/* 🔴 드로잉 포인트 */}
      {drawingPoints.map((pos, i) => (
        <Entity key={`pt-${i}`} position={pos}>
          <PointGraphics pixelSize={10} color={Color.RED} outlineColor={Color.YELLOW} outlineWidth={2} heightReference={HeightReference.CLAMP_TO_GROUND} disableDepthTestDistance={Number.POSITIVE_INFINITY} />
        </Entity>
      ))}

      {/* 🟡 가이드 라인 */}
      {isDrawing && drawingPoints.length > 0 && (
        <Entity>
          <PolylineGraphics positions={linePositions} width={3} material={Color.YELLOW} clampToGround={true} />
        </Entity>
      )}

      {/* 🟩 녹지 영역 */}
      {!isDrawing && drawingPoints.length >= 3 && (
        <Entity id="greenery-poly">
           <PolygonGraphics 
             hierarchy={new PolygonHierarchy(drawingPoints)} 
             material={Color.FORESTGREEN.withAlpha(0.4)} 
             classificationType={ClassificationType.BOTH} 
           />
        </Entity>
      )}

      {/* 🌳 나무 모델 렌더링 (이미지 삭제됨, 8000m까지 모델 표시) */}
      {trees.map((tree) => (
        <Entity 
            key={tree.id} 
            position={tree.position} 
            orientation={tree.orientation} 
        >
          {/* 모델이 있을 때만 렌더링 */}
          {tree.modelUrl && (
             <ModelGraphics
                uri={tree.modelUrl}
                scale={tree.scale}
                heightReference={HeightReference.CLAMP_TO_GROUND}
                shadows={ShadowMode.ENABLED}
                // ✅ [수정완료] 0 ~ 8000m까지 모델이 보입니다.
                distanceDisplayCondition={new DistanceDisplayCondition(0, 8000)}
              />
          )}
          {/* ❌ [삭제됨] BillboardGraphics가 제거되어 더 이상 이미지 에러가 발생하지 않습니다. */}
        </Entity>
      ))}
    </>
  );
};