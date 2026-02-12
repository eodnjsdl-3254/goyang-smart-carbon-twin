import React, { useEffect, useState, useRef } from 'react';
import { useCesium, Entity, PolygonGraphics, ModelGraphics, PointGraphics, PolylineGraphics } from 'resium';
import { 
  Color, HeightReference, ClassificationType, ScreenSpaceEventHandler, 
  ScreenSpaceEventType, Cartesian2, ImageMaterialProperty, Cartesian3, 
  CallbackProperty, PolygonHierarchy, ShadowMode, DistanceDisplayCondition
} from 'cesium';
import { useGreeneryContext } from '../../context/GreeneryContext';

export const GreeneryLayer: React.FC = () => {
  const { viewer } = useCesium();
  const { 
    trees, drawingPoints, setDrawingPoints, 
    isDrawing, setIsDrawing
    // generateTrees는 여기서 쓰지 않습니다 (패널 버튼으로만 실행)
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

    // 더블클릭 줌 방지
    viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      
    // [클릭] 점 추가
    handler.setInputAction((click: any) => {
        const pos = viewer.scene.pickPosition(click.position) || viewer.camera.pickEllipsoid(click.position);
        if (pos) setDrawingPoints(prev => [...prev, pos]);
    }, ScreenSpaceEventType.LEFT_CLICK);

    // [이동] 가이드라인 업데이트
    handler.setInputAction((move: any) => {
        const pos = viewer.scene.pickPosition(move.endPosition) || viewer.camera.pickEllipsoid(move.endPosition);
        if (pos) setMousePos(pos);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // [더블클릭] 그리기 종료 (이때 isDrawing = false가 되면서 텍스처 폴리곤이 나타남)
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

  /* ❌ [삭제됨] 자동 생성 트리거 
     이제 더블클릭 해도 바로 나무가 생기지 않습니다.
     사용자가 패널에서 [배치 실행] 버튼을 눌러야 생성됩니다.
  */

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

      {/* 🟡 가이드 라인 (그리는 중일 때만) */}
      {isDrawing && drawingPoints.length > 0 && (
        <Entity>
          <PolylineGraphics positions={linePositions} width={3} material={Color.YELLOW} clampToGround={true} />
        </Entity>
      )}

      {/* 🟩 임시 폴리곤 (그리는 중: 연두색) */}
      {isDrawing && drawingPoints.length >= 3 && (
        <Entity>
           <PolygonGraphics 
             hierarchy={new PolygonHierarchy(drawingPoints)} 
             material={Color.LIMEGREEN.withAlpha(0.5)} 
             classificationType={ClassificationType.BOTH} 
           />
        </Entity>
      )}

      {/* 🌿 텍스처 폴리곤 (완료 후: 텍스처) */}
      {/* 여기서 영역만 먼저 보여주고, 나무는 아직 생성되지 않음 */}
      {!isDrawing && drawingPoints.length >= 3 && (
        <Entity id="greenery-poly-texture">
           <PolygonGraphics 
             hierarchy={new PolygonHierarchy(drawingPoints)} 
             material={new ImageMaterialProperty({
                image: "/green/texture1.png",
                transparent: true,
                repeat: new Cartesian2(20, 20),
                color: Color.WHITE.withAlpha(0.8)
             })}
             classificationType={ClassificationType.BOTH} 
           />
        </Entity>
      )}

      {/* 🌳 나무 모델 (버튼 클릭 후 생성된 trees 데이터가 있을 때만 렌더링) */}
      {trees.map((tree) => (
        <Entity 
            key={tree.id} 
            position={tree.position} 
            orientation={tree.orientation} 
        >
          {tree.modelUrl && (
             <ModelGraphics
                uri={tree.modelUrl}
                scale={tree.scale} 
                heightReference={HeightReference.CLAMP_TO_GROUND}
                shadows={ShadowMode.ENABLED}
                // 0 ~ 4000m 가시거리
                distanceDisplayCondition={new DistanceDisplayCondition(0, 4000)}
              />
          )}
        </Entity>
      ))}
    </>
  );
};