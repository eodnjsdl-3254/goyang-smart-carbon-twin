import { Cartesian3, Quaternion } from 'cesium';

// =========================================================
// 🌲 녹지(Greenery) 전용 타입
// =========================================================

export interface GreeneryModel {
  id: string | number;
  name?: string;
  category?: string;
  thumbnail?: string;
  modelUrl?: string;
}

export interface TreeSpec {
  mlid: number;
  url: string | null;
  width: number;
  depth: number;
  area: number;
  loaded: boolean;
}

export interface TreeConfig {
  conifer: TreeSpec;
  deciduous: TreeSpec;
}

export interface TreeItem {
  id: string;
  position: Cartesian3;
  type: 'CONIFER' | 'DECIDUOUS';
  modelUrl: string;
  scale: number;
  orientation: Quaternion;
}