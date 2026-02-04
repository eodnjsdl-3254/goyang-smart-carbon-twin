import { useState, useCallback } from 'react';
import { Cartesian3, Color } from 'cesium';

// 마커 데이터 타입 정의
export interface MarkerData {
  id: string;
  name: string;
  position: Cartesian3;
  description?: string;
}

export const useMapMarkers = () => {
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  const addMarker = useCallback((lat: number, lon: number, id: string, name: string) => {
    const newMarker: MarkerData = {
      id,
      name,
      position: Cartesian3.fromDegrees(lon, lat),
      description: `Marker ${name}`
    };
    setMarkers(prev => [...prev, newMarker]);
  }, []);

  const clearMarkers = useCallback(() => {
    setMarkers([]);
  }, []);

  return { markers, addMarker, clearMarkers };
};