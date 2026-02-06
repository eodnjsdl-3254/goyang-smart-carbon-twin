import { Cartographic, Math as CesiumMath, Cartesian3 } from 'cesium';
import type { BuildingProps } from '../types';
import type { TreeItem } from '@/features/green-space';

/**
 * 🌐 Cartesian3 좌표를 위경도 [Lon, Lat, Alt]로 변환
 */
const cartesianToCoords = (pos: Cartesian3) => {
  const carto = Cartographic.fromCartesian(pos);
  return [
    CesiumMath.toDegrees(carto.longitude),
    CesiumMath.toDegrees(carto.latitude),
    carto.height
  ];
};

/**
 * 🏢 + 🌲 건물과 나무 데이터를 통합하여 GeoJSON FeatureCollection 생성
 */
export const convertScenarioToGeoJSON = (
  buildings: BuildingProps[], 
  trees: TreeItem[], 
  sceneName: string
) => {
  const bldgFeatures = buildings.map((b) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [b.lon, b.lat, b.height / 2],
    },
    properties: {
      category: "BUILDING",
      id: b.id,
      width: b.width,
      depth: b.depth,
      height: b.height,
      rotation: b.rotation,
      isModel: b.isModel,
    },
  }));

  const treeFeatures = trees.map((t, idx) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: cartesianToCoords(t.position),
    },
    properties: {
      category: "GREENERY",
      id: `tree-${idx}`,
      species: t.type,
    },
  }));

  return {
    type: "FeatureCollection" as const,
    name: sceneName,
    features: [...bldgFeatures, ...treeFeatures],
  };
};

/**
 * 💾 파일 다운로드 실행
 */
export const downloadGeoJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
};