import { useCallback } from 'react';
import { Cartesian3 } from 'cesium';
import { useCesium } from 'resium';

export const useMapControl = () => {
  const { viewer } = useCesium();

  const flyTo = useCallback((lat: number, lon: number, height: number = 5000) => {
    viewer?.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, lat, height),
      duration: 2,
    });
  }, [viewer]);

  const viewHome = useCallback(() => {
    flyTo(36.5, 127.5, 1000000); // 한반도 전체 뷰
  }, [flyTo]);

  const flyToGoyang = useCallback(() => {
    flyTo(37.658, 126.832, 2000); // 고양시청
  }, [flyTo]);

  return { flyTo, viewHome, flyToGoyang };
};