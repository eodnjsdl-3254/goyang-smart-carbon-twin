import client from '@/lib/api/client';

// 1. 공통/건물 타입
import type { 
  LibraryItem, 
  SceneListSummary, 
  SceneResponse, 
  GeoJSONFeatureCollection 
} from '@/features/bldg/types';

// 2. 녹지 전용 타입
import type { GreeneryModel } from '../types';

// 건물 라이브러리 조회
export const fetchBuildingLibrary = async (): Promise<LibraryItem[]> => {
  // 응답값은 interceptor에 의해 이미 data만 반환됨
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

// 녹지 라이브러리 조회 (GreeneryModel 사용)
export const fetchGreeneryLibrary = async (): Promise<GreeneryModel[]> => {
  const rawData = await client.get<any[], any[]>('/simulation/buildings');

  return rawData.map((item: any) => {
    const cleanUrl = item.modelUrl ? item.modelUrl.replace(/^\/files/, '').replace(/^\//, '') : '';
    const cleanThumb = item.thumbnail ? item.thumbnail.replace(/^\/files/, '').replace(/^\//, '') : '';

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      thumbnail: cleanThumb ? `/files/${cleanThumb}` : undefined,
      modelUrl: cleanUrl ? `/files/${cleanUrl}` : undefined, 
    };
  });
};

// 시나리오 목록 조회
export const fetchSceneList = async (): Promise<SceneListSummary[]> => {
  return client.get<SceneListSummary[], SceneListSummary[]>('/scenes');
};

// 시나리오 저장 (GeoJSON 전송)
export const saveScene = async (name: string, data: GeoJSONFeatureCollection): Promise<number> => {
  const payload = { 
    scene_name: name, 
    user_id: "admin", // 추후 로그인 연동 시 변경
    scene_data: data 
  };
  
  const response = await client.post<
    { scene_id: number }, 
    { scene_id: number }
  >('/scenes', payload);
  
  return response.scene_id;
};

// 시나리오 상세 로드
export const fetchSceneDetail = async (sceneId: number): Promise<SceneResponse> => {
  return client.get<SceneResponse, SceneResponse>(`/scenes/${sceneId}`);
};