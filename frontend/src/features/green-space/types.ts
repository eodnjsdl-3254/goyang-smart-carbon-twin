import { Cartesian3, Quaternion } from 'cesium';

export interface GreeneryModel {
  id: string | number;
  modelUrl: string;
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
  id: string;          // 리액트 key 및 식별용
  position: Cartesian3;
  type: 'CONIFER' | 'DECIDUOUS';
  modelUrl: string;
  scale: number;
  orientation: Quaternion; // 나무의 회전값
}