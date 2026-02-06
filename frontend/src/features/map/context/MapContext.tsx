import React, { createContext, useContext, useState, useCallback } from 'react';

interface MapContextType {
  currentBaseMap: 'OSM' | 'Satellite' | 'Hybrid';
  setBaseMap: (type: 'OSM' | 'Satellite' | 'Hybrid') => void;
  showVWorld3D: boolean;
  setShowVWorld3D: (show: boolean) => void;
  cameraTarget: { lat: number; lon: number; height: number; ts: number };
  flyTo: (lat: number, lon: number, height?: number) => void;
  
  // vworldKey 타입 추가
  vworldKey: string;
}

const MapContext = createContext<MapContextType | null>(null);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBaseMap, setCurrentBaseMap] = useState<'OSM' | 'Satellite' | 'Hybrid'>('OSM');
  const [showVWorld3D, setShowVWorld3D] = useState(false);
  const [cameraTarget, setCameraTarget] = useState({ lat: 37.6583, lon: 126.8322, height: 15000, ts: 0 });

  // 환경변수에서 키 가져오기 (없으면 빈 문자열)
  const vworldKey = import.meta.env.VITE_VWORLD_KEY || "";

  const flyTo = useCallback((lat: number, lon: number, height: number = 2000) => {
    setCameraTarget({ lat, lon, height, ts: Date.now() });
  }, []);

  return (
    <MapContext.Provider value={{ 
      currentBaseMap, setBaseMap: setCurrentBaseMap, 
      showVWorld3D, setShowVWorld3D, 
      cameraTarget, flyTo,
      
      // Provider에 값 전달
      vworldKey 
    }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) throw new Error("MapProvider 내에서 사용하세요.");
  return context;
};