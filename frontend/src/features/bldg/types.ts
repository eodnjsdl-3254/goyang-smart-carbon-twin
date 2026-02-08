export type SimMode = 'IDLE' | 'LIBRARY' | 'CREATE' | 'RELOCATE' | 'VIEW';

export interface LibraryItem {
  id: string;
  name: string;
  modelUrl: string;
  thumbnail?: string;
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
}

export interface BuildingProps {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  rotation: number;
  isModel: boolean;
  modelUrl?: string;
  width?: number;
  depth?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  originalWidth?: number;
  originalDepth?: number;
  originalHeight?: number;
}

export interface SimInputs {
  width: number;
  depth: number;
  height: number;
}