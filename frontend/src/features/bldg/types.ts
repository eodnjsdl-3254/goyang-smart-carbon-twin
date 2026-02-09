export type SimMode = 'IDLE' | 'LIBRARY' | 'CREATE' | 'RELOCATE' | 'VIEW';

// 건물 박스 및 라이브러리 관련 타입
export interface LibraryItem {
  id: string;
  name: string;
  category?: string;
  modelUrl: string;
  thumbnail?: string;
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
}

export interface BuildingProps {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  rotation: number;
  isModel: boolean;
  modelUrl?: string;
  width?: number;
  depth?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  originalWidth?: number;
  originalDepth?: number;
  originalHeight?: number;
  mlid?: number;
}

export interface SimInputs {
  width: number;
  depth: number;
  height: number;
}


// GeoJSON 및 시나리오 관련 타입
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    mlid?: number;    // 저장/로드 시 핵심 식별자
    name?: string;
    isModel?: boolean; // GeoJSON에서는 값이 없을 수도 있음
    modelUrl?: string;
    height?: number;
    width?: number;
    depth?: number;
    rotation?: number;
    altitude?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    [key: string]: any;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface SceneResponse {
  scene_id: number;
  scene_name: string;
  user_id: string;
  reg_date: string;
  scene_data: GeoJSONFeatureCollection;
}

export interface SceneListSummary {
  scene_id: number;
  scene_name: string;
  user_id: string;
  reg_date: string;
}