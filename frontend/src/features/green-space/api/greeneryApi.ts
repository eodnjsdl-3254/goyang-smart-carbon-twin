import type { GreeneryModel } from '../types';

/**
 * 녹지 시뮬레이션에 필요한 나무 모델 라이브러리 목록을 가져옵니다.
 */
export const fetchGreeneryLibrary = async (): Promise<GreeneryModel[]> => {
  // ✅ 1. /api 접두사를 추가하여 Nginx 프록시를 통하도록 수정
  const res = await fetch('/api/simulation/buildings'); 
  if (!res.ok) throw new Error('녹지 라이브러리 로딩 실패');
  
  const rawData = await res.json();

  return rawData.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    // ✅ 2. bldgApi와 동일하게 /files 경로를 보정하여 Nginx가 정적 파일을 찾게 함
    thumbnail: item.thumbnail ? `/files${item.thumbnail.replace('/files', '')}` : undefined,
    modelUrl: item.modelUrl ? `/files${item.modelUrl.replace('/files', '')}` : undefined,
  }));
};

/**
 * 시나리오 저장 (녹지 전용이 아닌 공통 API를 사용해도 무방합니다)
 */
export const saveGreeneryScene = async (name: string, data: any): Promise<number> => {
  const payload = {
    scene_name: name,
    user_id: "admin", 
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