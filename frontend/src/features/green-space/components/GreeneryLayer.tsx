import React, { useEffect } from 'react';
import { useCesium } from 'resium';
import { 
  Entity, BillboardGraphics, PolygonGraphics, ModelGraphics, 
  PointGraphics, PolylineGraphics 
} from 'resium';
import { 
  Color, HeightReference, VerticalOrigin, ClassificationType, 
  Cartesian2, ImageMaterialProperty, Cartesian3,
  ScreenSpaceEventHandler, ScreenSpaceEventType, defined
} from 'cesium';
import { useGreeneryContext } from '../context/GreeneryContext';

export const GreeneryLayer: React.FC = () => {
  const { viewer } = useCesium();
  
  const { 
    trees, drawingPoints, setDrawingPoints, isDrawing, setIsDrawing, generateTrees 
  } = useGreeneryContext();

  // ----------------------------------------------------
  // [1] Cesium 이벤트 핸들링 (그리기 로직)
  // ----------------------------------------------------
  useEffect(() => {
    if (!viewer || !viewer.scene || !viewer.camera) return;

    // 그리기용 핸들러 (커스텀)
    const drawHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    
    // 뷰어의 기본 핸들러 (더블클릭 줌 제어용)
    const viewerHandler = viewer.screenSpaceEventHandler;

    if (isDrawing) {
      // (1) 뷰어의 기본 더블클릭 동작(줌인/추적) 제거
      // *참고: ScreenSpaceCameraController가 아니라 EventHandler에서 제거해야 합니다.
      viewerHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      
      viewer.canvas.style.cursor = 'crosshair';

      // [클릭] 점 추가
      drawHandler.setInputAction((click: any) => {
        const rayPosition = click.position;
        let cartesian: Cartesian3 | undefined = viewer.scene.pickPosition(rayPosition);

        if (!defined(cartesian)) {
          cartesian = viewer.camera.pickEllipsoid(rayPosition, viewer.scene.globe.ellipsoid);
        }

        if (defined(cartesian)) {
          const validPosition = cartesian as Cartesian3; 
          setDrawingPoints((prev) => [...prev, validPosition]);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      // [더블 클릭] 그리기 종료
      drawHandler.setInputAction((click: any) => {
        const rayPosition = click.position;
        let cartesian: Cartesian3 | undefined = viewer.scene.pickPosition(rayPosition);

        if (!defined(cartesian)) {
            cartesian = viewer.camera.pickEllipsoid(rayPosition, viewer.scene.globe.ellipsoid);
        }
        
        if (defined(cartesian)) {
            generateTrees(); 
            setIsDrawing(false); 
        }
      }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    } else {
      // (2) 그리기 모드 아닐 때: 커서 복구
      viewer.canvas.style.cursor = 'default';
      
      // (선택사항) 뷰어의 기본 더블클릭 동작을 복구하고 싶다면 아래 주석 해제
      // viewerHandler.setInputAction(
      //    (movement: any) => { /* 기본 동작 로직 */ }, 
      //    ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      // );
      
      drawHandler.destroy();
    }

    return () => {
      if (!drawHandler.isDestroyed()) drawHandler.destroy();
      if (viewer && !viewer.isDestroyed()) {
          viewer.canvas.style.cursor = 'default';
      }
    };
  }, [viewer, isDrawing, setDrawingPoints, setIsDrawing, generateTrees]);


  // ----------------------------------------------------
  // [2] 텍스처 및 시각화 설정
  // ----------------------------------------------------
  const polygonMaterial = new ImageMaterialProperty({
    image: "/green/texture1.png", 
    transparent: true,
    repeat: new Cartesian2(20, 20), 
    color: Color.WHITE 
  });

  const polylinePositions = isDrawing 
    ? drawingPoints 
    : (drawingPoints.length > 0 ? [...drawingPoints, drawingPoints[0]] : []);

  return (
    <>
      {drawingPoints.map((pos, i) => (
        <Entity key={`pt-${i}`} position={pos}>
          <PointGraphics pixelSize={12} color={Color.RED} outlineColor={Color.YELLOW} outlineWidth={2} heightReference={HeightReference.CLAMP_TO_GROUND} disableDepthTestDistance={Number.POSITIVE_INFINITY} />
        </Entity>
      ))}

      {drawingPoints.length >= 2 && (
        <Entity>
          <PolylineGraphics positions={polylinePositions} width={4} material={Color.YELLOW} clampToGround={true} />
        </Entity>
      )}

      {drawingPoints.length >= 3 && (
        <Entity>
          <PolygonGraphics hierarchy={drawingPoints} material={polygonMaterial} classificationType={ClassificationType.BOTH} zIndex={1} />
        </Entity>
      )}

      {trees.map((tree, i) => (
        <Entity key={`tree-${i}`} position={tree.position}>
          {tree.modelUrl && tree.modelUrl.length > 5 ? (
            <ModelGraphics uri={tree.modelUrl} scale={tree.scale || 1.0} heightReference={HeightReference.CLAMP_TO_GROUND} shadows={1} />
          ) : (
            <BillboardGraphics image={tree.type === 'CONIFER' ? "/assets/tree1.png" : "/assets/tree2.png"} width={24} height={24} heightReference={HeightReference.CLAMP_TO_GROUND} verticalOrigin={VerticalOrigin.BOTTOM} disableDepthTestDistance={Number.POSITIVE_INFINITY} />
          )}
        </Entity>
      ))}
    </>
  );
};