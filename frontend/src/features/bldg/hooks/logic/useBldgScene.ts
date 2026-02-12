import { useState, useCallback } from 'react';
import type { BuildingProps, GeoJSONFeatureCollection } from '../../types';
import { fetchSceneList, fetchSceneDetail, saveScene } from '../../api/bldgApi';

export const useBldgScene = (
  buildings: BuildingProps[],
  setBuildings: React.Dispatch<React.SetStateAction<BuildingProps[]>>
) => {
  // 상태 관리
  const [sceneList, setSceneList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. [변환] BuildingProps[] -> GeoJSON FeatureCollection
  const toGeoJSON = useCallback((): GeoJSONFeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: buildings.map((b) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          // types.ts에서 coordinates: number[] 로 정의했으므로 3개(lon, lat, alt)를 넣어도 안전합니다.
          coordinates: [b.lon, b.lat, b.altitude || 0],
        },
        properties: {
          // GeoJSON 표준 속성 외 커스텀 속성 매핑
          id: b.id,
          mlid: b.mlid,
          name: b.name,
          isModel: b.isModel,
          modelUrl: b.modelUrl,
          
          // 위치/회전/크기 정보
          rotation: b.rotation,
          height: b.height,
          width: b.width,
          depth: b.depth,
          scaleX: b.scaleX,
          scaleY: b.scaleY,
          scaleZ: b.scaleZ,
          altitude: b.altitude,
        },
      })),
    };
  }, [buildings]);

  // 2. [변환] GeoJSON FeatureCollection -> BuildingProps[]
  const fromGeoJSON = useCallback(
    (geojson: GeoJSONFeatureCollection) => {
      if (!geojson || !geojson.features) return;

      const loadedBuildings: BuildingProps[] = geojson.features.map((f) => {
        const p = f.properties;
        const coords = f.geometry.coordinates; // number[] 타입

        return {
          id: p.id || crypto.randomUUID(),
          mlid: p.mlid, // DB 모델 ID 복원
          name: p.name || 'Loaded Building',

          // 좌표 복원 (배열 인덱스 접근)
          lon: coords[0] || 0,
          lat: coords[1] || 0,
          // 고도: 좌표 3번째 값이 있으면 우선 사용, 없으면 속성값 사용
          altitude: coords[2] ?? p.altitude ?? 0,

          isModel: p.isModel ?? false,
          modelUrl: p.modelUrl,

          rotation: p.rotation || 0,
          height: p.height,
          width: p.width,
          depth: p.depth,
          
          scaleX: p.scaleX ?? 1,
          scaleY: p.scaleY ?? 1,
          scaleZ: p.scaleZ ?? 1,

          originalWidth: p.originalWidth,
          originalDepth: p.originalDepth,
          originalHeight: p.originalHeight,
        };
      });
      setBuildings(loadedBuildings);
    },
    [setBuildings]
  );

  // 3. 시나리오 목록 조회 (API)
  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchSceneList();
      setSceneList(list); // setSceneList 사용됨
    } catch (e) {
      console.error('Failed to load scene list:', e);
    } finally {
      setLoading(false); // setLoading 사용됨
    }
  }, []);

  // 4. 시나리오 저장 (API)
  const handleSave = useCallback(
    async (sceneName: string) => {
      if (!sceneName) return;
      setLoading(true);
      try {
        const geojson = toGeoJSON();
        await saveScene(sceneName, geojson); // saveScene 사용됨
        alert('성공적으로 저장되었습니다.');
        await loadList(); // 저장 후 목록 갱신
      } catch (e) {
        console.error('Failed to save scene:', e);
        alert('저장에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [toGeoJSON, loadList]
  );

  // 5. 시나리오 상세 불러오기 (API)
  const handleLoad = useCallback(
    async (sceneId: number) => {
      setLoading(true);
      try {
        const data = await fetchSceneDetail(sceneId); // fetchSceneDetail 사용됨
        if (data.scene_data) {
          fromGeoJSON(data.scene_data);
          alert(`'${data.scene_name}' 시나리오를 불러왔습니다.`);
        }
      } catch (e) {
        console.error('Failed to load scene detail:', e);
        alert('시나리오를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [fromGeoJSON]
  );

  return {
    sceneList,
    loading,
    loadList,
    handleSave,
    handleLoad,
  };
};