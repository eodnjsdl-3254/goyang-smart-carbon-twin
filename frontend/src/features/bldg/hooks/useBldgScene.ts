// frontend/src/features/bldg/hooks/useBldgScene.ts

import { useState, useCallback } from 'react';
import type { BuildingProps, GeoJSONFeatureCollection } from '../types'; // GeoJSONFeature 등은 내부 사용하거나 types에서 import
import { fetchSceneList, fetchSceneDetail, saveScene } from '../api/bldgApi';

export const useBldgScene = (
  buildings: BuildingProps[],
  setBuildings: React.Dispatch<React.SetStateAction<BuildingProps[]>>
) => {
  const [sceneList, setSceneList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. [변환] BuildingProps[] -> GeoJSON FeatureCollection
  const toGeoJSON = useCallback((): GeoJSONFeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: buildings.map(b => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [b.lon, b.lat] // GeoJSON 순서: [경도, 위도]
        },
        properties: {
          id: b.id,
          mlid: b.mlid, // 이제 타입 에러 없음
          name: b.name,
          isModel: b.isModel,
          modelUrl: b.modelUrl, // 저장 시에는 필요 없으나 로드 후 확인용으로 포함 가능 (백엔드는 mlid 우선)
          rotation: b.rotation,
          height: b.height,
          width: b.width,
          depth: b.depth,
          scaleX: b.scaleX,
          scaleY: b.scaleY,
          scaleZ: b.scaleZ,
          altitude: b.altitude
        }
      }))
    };
  }, [buildings]);

  // 2. [변환] GeoJSON FeatureCollection -> BuildingProps[]
  const fromGeoJSON = useCallback((geojson: GeoJSONFeatureCollection) => {
    if (!geojson.features) return;

    const loadedBuildings: BuildingProps[] = geojson.features.map(f => {
      const p = f.properties;
      const coords = f.geometry.coordinates; // [lon, lat]

      return {
        id: p.id || crypto.randomUUID(),
        mlid: p.mlid, // DB 모델 ID 복원
        name: p.name || 'Loaded Building',
        // 좌표 복원
        lon: coords[0], 
        lat: coords[1],
        
        // [수정] boolean | undefined -> boolean 강제 변환
        isModel: p.isModel ?? false, 
        
        // 나머지 속성 복원
        modelUrl: p.modelUrl, // 백엔드에서 주입된 URL
        rotation: p.rotation || 0,
        height: p.height,
        width: p.width,
        depth: p.depth,
        altitude: p.altitude || 0,
        scaleX: p.scaleX ?? 1,
        scaleY: p.scaleY ?? 1,
        scaleZ: p.scaleZ ?? 1,
      };
    });
    setBuildings(loadedBuildings);
  }, [setBuildings]);

  // ... (나머지 loadList, handleSave, handleLoad 함수는 기존 코드와 동일)
  const loadList = async () => {
    try {
      const list = await fetchSceneList();
      setSceneList(list);
    } catch (e) {
      console.error(e);
      // alert('목록을 불러오지 못했습니다.'); // 필요 시 주석 해제
    }
  };

  const handleSave = async (sceneName: string) => {
    if (!sceneName) return;
    setLoading(true);
    try {
      const geojson = toGeoJSON();
      await saveScene(sceneName, geojson);
      alert('저장되었습니다.');
      await loadList();
    } catch (e) {
      console.error(e);
      alert('저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (sceneId: number) => {
    setLoading(true);
    try {
      const data = await fetchSceneDetail(sceneId);
      if (data.scene_data) {
        fromGeoJSON(data.scene_data);
      }
    } catch (e) {
      console.error(e);
      alert('시나리오 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  return {
    sceneList,
    loading,
    loadList,
    handleSave,
    handleLoad
  };
};