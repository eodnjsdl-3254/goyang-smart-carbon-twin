import client from '@/lib/api/client';
import type { LibraryItem, SceneListSummary, SceneResponse, GeoJSONFeatureCollection } from '../types';

// 1. 빌딩 라이브러리 조회
export const fetchBuildingLibrary = async (): Promise<LibraryItem[]> => {
  const rawData = await client.get<any[], any[]>('/simulation/buildings');
  
  return rawData.map((item: any) => ({
    ...item,
    thumbnail: item.thumbnail ? `/files${item.thumbnail.replace('/files', '')}` : undefined,
    modelUrl: item.modelUrl ? `/files${item.modelUrl.replace('/files', '')}` : undefined,
    defaultWidth: Number(item.defaultWidth) || 20,
    defaultDepth: Number(item.defaultDepth) || 20,
    defaultHeight: Number(item.defaultHeight) || 30,
  }));
};

// 2. 시나리오 목록 조회
export const fetchSceneList = async (): Promise<SceneListSummary[]> => {
  return client.get<SceneListSummary[], SceneListSummary[]>('/scenes');
};

// 3. 시나리오 저장 (GeoJSON 전송)
export const saveScene = async (name: string, data: GeoJSONFeatureCollection): Promise<number> => {
  const payload = {
    scene_name: name,
    user_id: "admin",
    scene_data: data
  };

  const response = await client.post<
    { scene_id: number }, 
    { scene_id: number }
  >('/scenes', payload);
  
  return response.scene_id;
};

// 4. 시나리오 상세 로드
export const fetchSceneDetail = async (sceneId: number): Promise<SceneResponse> => {
  return client.get<SceneResponse, SceneResponse>(`/scenes/${sceneId}`);
};