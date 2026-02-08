import type { LibraryItem } from '../types';

export const fetchBuildingLibrary = async (): Promise<LibraryItem[]> => {
  const res = await fetch('/api/simulation/buildings'); 
  if (!res.ok) throw new Error('라이브러리 로딩 실패');
  
  const rawData = await res.json();

  return rawData.map((item: any) => ({
    ...item,
    // DB의 "/public/..." 앞에 "/files"를 붙여줍니다.
    // 결과: "/files/public/3ds_model/..."
    thumbnail: item.thumbnail ? `/files${item.thumbnail}` : undefined,
    modelUrl: item.modelUrl ? `/files${item.modelUrl}` : undefined,
    
    defaultWidth: Number(item.defaultWidth) || 20,
    defaultDepth: Number(item.defaultDepth) || 20,
    defaultHeight: Number(item.defaultHeight) || 30,
  }));
};