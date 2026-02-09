import { Cartesian3 } from 'cesium';

// 백엔드 응답(LibraryItemResponse)과 일치시킴
export interface LibraryItem {
  id: string;
  name: string;
  category?: string;
  thumbnail?: string;
  modelUrl?: string;
  defaultWidth?: number;
  defaultDepth?: number;
  defaultHeight?: number;
}

// 나무 개별 객체 (화면에 배치된 나무)
export interface TreeItem {
  position: Cartesian3;
  type: 'CONIFER' | 'DECIDUOUS';
  modelUrl: string;
  scale: number;
}

// 나무 모델 스펙 (설정값)
export interface TreeSpec {
  mlid: number;
  url: string | null;
  width: number;
  area: number;
  loaded: boolean;
}

// 전체 설정 (침엽수/활엽수)
export interface TreeConfig {
  conifer: TreeSpec;
  deciduous: TreeSpec;
}