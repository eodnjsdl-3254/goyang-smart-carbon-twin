import { useEffect, useCallback } from 'react';
import { useCesium } from 'resium';
import * as Cesium from 'cesium';

interface MapEventProps {
  onMapClick?: (coords: { lat: number; lon: number; height: number }) => void;
  onEntityClick?: (entity: Cesium.Entity) => void;
  mode?: 'SELECT' | 'PLACEMENT' | 'GREENERY';
}

export const useMapEvents = ({ onMapClick, onEntityClick, mode = 'SELECT' }: MapEventProps) => {
  const { viewer } = useCesium();

  const handleLeftClick = useCallback((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    if (!viewer) return;

    // 1. 좌표 추출 로직
    let cartesian: Cesium.Cartesian3 | undefined = viewer.scene.pickPosition(click.position);
    
    if (!Cesium.defined(cartesian)) {
      cartesian = viewer.camera.pickEllipsoid(click.position);
    }

    // 타입 가드: cartesian이 확실히 존재할 때만 로직 실행
    if (Cesium.defined(cartesian) && cartesian instanceof Cesium.Cartesian3) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const coords = {
        lon: Cesium.Math.toDegrees(cartographic.longitude),
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height,
      };

      if (onMapClick) onMapClick(coords);
    }

    // 2. 객체 선택 로직
    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
      if (onEntityClick) onEntityClick(picked.id);
    }
  }, [viewer, onMapClick, onEntityClick]);

  useEffect(() => {
    if (!viewer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    // 입력 동작 타입 정의
    handler.setInputAction(handleLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => handler.destroy();
  }, [viewer, handleLeftClick]);
};