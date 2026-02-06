export interface BuildingProps {
  id: string;
  lat: number;
  lon: number;
  height: number;
  width: number;
  depth: number;
  rotation: number;
  scale: number;
  isModel: boolean;
  originalWidth: number; 
  originalDepth: number;
  originalHeight: number;
  rootNodeName?: string;
  modelUrl?: string;
  metaData?: Record<string, any>;
}

export interface SimInputs {
  width: number;
  depth: number;
  height: number;
  rotation: number;
  scale: number;
}

export type SimMode = 'CREATE' | 'UPLOAD' | 'CONVERT' | 'SELECT' | 'GREENERY';