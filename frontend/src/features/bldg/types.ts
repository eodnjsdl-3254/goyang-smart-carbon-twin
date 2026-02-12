export type SimMode = 'IDLE' | 'LIBRARY' | 'CREATE' | 'RELOCATE' | 'VIEW';

// 건물 박스 및 라이브러리 관련 타입
export interface LibraryItem {
  id: string; // 참고: DB ID가 숫자라면 number로 바꾸는 것을 권장합니다.
  name: string;
  category?: string;
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
  mlid?: number;
}

export interface SimInputs {
  width: number;
  depth: number;
  height: number;
}

// GeoJSON 및 시나리오 관련 타입
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    // [중요] number[]로 설정되어 있어 [lon, lat, alt] 처리가 가능합니다. Good!
    coordinates: number[]; 
  };
  properties: {
    id: string;
    mlid?: number;
    name?: string;
    isModel?: boolean;
    modelUrl?: string;
    
    // 위치/회전/크기 정보
    height?: number;
    width?: number;
    depth?: number;
    rotation?: number;
    altitude?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    
    [key: string]: any;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface SceneResponse {
  scene_id: number;
  scene_name: string;
  user_id: string;
  reg_date: string;
  scene_data: GeoJSONFeatureCollection;
}

export interface SceneListSummary {
  scene_id: number;
  scene_name: string;
  user_id: string;
  reg_date: string;
}

export interface BldgContextType {
  // 1. 시뮬레이션 상태
  mode: SimMode;
  setMode: (mode: SimMode) => void;
  
  buildings: BuildingProps[];
  setBuildings: React.Dispatch<React.SetStateAction<BuildingProps[]>>;
  
  // 지도 상의 건물 선택
  selectedBuilding: BuildingProps | null;
  selectedId: string | null; 
  setSelectedBuildingId: (id: string | null) => void; 
  
  // 2. 입력 및 제어
  inputs: SimInputs;
  updateInput: (key: keyof SimInputs, value: number) => void;
  rotation: number;
  setRotation: (deg: number) => void;
  
  cursorPos: { lat: number; lon: number } | null;
  setCursorPos: (pos: { lat: number; lon: number } | null) => void;
  ghostBuilding: BuildingProps | null;
  
  updateBuilding: (id: string, updates: Partial<BuildingProps>) => void;
  removeBuilding: (id: string) => void;
  finishEditing: () => void;

  handleMapClick: (coords: { lat: number; lon: number }, pickedId?: string) => void;
  handleMouseMove: (coords: { lat: number; lon: number }) => void;

  // 3. 라이브러리 상태
  libraryItems: LibraryItem[];
  selectedLibItem: LibraryItem | null;
  
  // 라이브러리 목록에서 아이템 선택
  selectLibraryItem: (item: LibraryItem) => void; 
  
  isLoading: boolean;
  error: Error | null;
}