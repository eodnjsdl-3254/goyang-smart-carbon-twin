// 1. 공통/건물 타입
import type { 
  LibraryItem, 
  SceneListSummary, 
  SceneResponse, 
  GeoJSONFeatureCollection 
} from '@/features/bldg/types';

// 2. 녹지 전용 타입
import type { GreeneryModel } from '../types';

// =========================================================
// API 구현
// =========================================================

// 건물 라이브러리 (기존 유지)
export const fetchBuildingLibrary = async (): Promise<LibraryItem[]> => {
  const res = await fetch('/api/simulation/buildings'); 
  if (!res.ok) throw new Error('라이브러리 로딩 실패');
  
  const rawData = await res.json();
  return rawData.map((item: any) => ({
    ...item,
    thumbnail: item.thumbnail ? `/files${item.thumbnail.replace('/files', '')}` : undefined,
    modelUrl: item.modelUrl ? `/files${item.modelUrl.replace('/files', '')}` : undefined,
    defaultWidth: Number(item.defaultWidth) || 20,
    defaultDepth: Number(item.defaultDepth) || 20,
    defaultHeight: Number(item.defaultHeight) || 30,
  }));
};

// 녹지 라이브러리 (GreeneryModel 사용)
export const fetchGreeneryLibrary = async (): Promise<GreeneryModel[]> => {
  const res = await fetch('/api/simulation/buildings'); 
  if (!res.ok) throw new Error('녹지 라이브러리 로딩 실패');
  
  const rawData = await res.json();

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

// ... (하단 시나리오 함수들은 types.ts의 타입을 사용하므로 그대로 유지)
export const fetchSceneList = async (): Promise<SceneListSummary[]> => {
  const res = await fetch('/api/scenes');
  if (!res.ok) throw new Error('시나리오 목록 로딩 실패');
  return res.json();
};

export const saveScene = async (name: string, data: GeoJSONFeatureCollection): Promise<number> => {
    // ... (기존 코드와 동일)
    const payload = { scene_name: name, user_id: "admin", scene_data: data };
    const res = await fetch('/api/scenes', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
    if (!res.ok) throw new Error('저장 실패');
    return (await res.json()).scene_id;
};

export const fetchSceneDetail = async (sceneId: number): Promise<SceneResponse> => {
  const res = await fetch(`/api/scenes/${sceneId}`);
  if (!res.ok) throw new Error('상세 로딩 실패');
  return res.json();
};