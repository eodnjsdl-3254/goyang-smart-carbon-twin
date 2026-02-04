export interface BuildingProps {
  id: string;
  name?: string;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  scale: number;
  lat: number;
  lon: number;
  isModel?: boolean; // GLB 모델 여부
}

export interface SimInputs {
  width: number;
  depth: number;
  height: number;
  rotation: number;
  scale: number;
}

export type SimMode = 'CREATE' | 'UPLOAD' | 'CONVERT' | 'EDIT';