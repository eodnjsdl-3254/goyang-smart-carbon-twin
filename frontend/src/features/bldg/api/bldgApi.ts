import type { LibraryItem, SceneListSummary, SceneResponse, GeoJSONFeatureCollection } from '../types';

// 기존 라이브러리 조회 함수 유지
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

// 1. 시나리오 목록 조회
export const fetchSceneList = async (): Promise<SceneListSummary[]> => {
  const res = await fetch('/api/scenes');
  if (!res.ok) throw new Error('시나리오 목록 로딩 실패');
  return res.json();
};

// 2. 시나리오 저장 (GeoJSON 전송)
export const saveScene = async (name: string, data: GeoJSONFeatureCollection): Promise<number> => {
  const payload = {
    scene_name: name,
    user_id: "admin", // 추후 로그인 연동 시 변경
    scene_data: data
  };

  const res = await fetch('/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('시나리오 저장 실패');
  const json = await res.json();
  return json.scene_id;
};

// 3. 시나리오 상세 로드
export const fetchSceneDetail = async (sceneId: number): Promise<SceneResponse> => {
  const res = await fetch(`/api/scenes/${sceneId}`);
  if (!res.ok) throw new Error('시나리오 상세 로딩 실패');
  return res.json();
};