import React, { createContext, useContext, useCallback } from 'react';
import { useBldgLibrary } from '../hooks/useBldgLibrary';
import { useBldgSim } from '../hooks/useBldgSim';
import type { BuildingProps, LibraryItem, SimMode, SimInputs } from '../types';

// ✅ Context 타입: Panel과 Layer가 사용하는 모든 기능을 포함하도록 확장
interface BldgContextType {
  // [1] 시뮬레이션 상태 (useBldgSim)
  mode: SimMode;
  setMode: (mode: SimMode) => void;
  
  buildings: BuildingProps[];
  setBuildings: React.Dispatch<React.SetStateAction<BuildingProps[]>>;
  
  selectedBuilding: BuildingProps | null;
  selectedId: string | null; // Layer 호환용
  setSelectedBuildingId: (id: string | null) => void;
  
  cursorPos: { lat: number; lon: number } | null;
  setCursorPos: (pos: { lat: number; lon: number } | null) => void;
  ghostBuilding: BuildingProps | null;
  
  inputs: SimInputs;
  updateInput: (key: keyof SimInputs, value: number) => void;
  rotation: number;
  setRotation: (deg: number) => void;
  
  updateBuilding: (id: string, updates: Partial<BuildingProps>) => void;
  removeBuilding: (id: string) => void;
  finishEditing: () => void; // 편집 종료

  handleMapClick: (e: any) => void;
  handleMouseMove: (e: any) => void;

  // [2] 라이브러리 상태 (useBldgLibrary)
  libraryItems: LibraryItem[];
  selectedLibItem: LibraryItem | null;
  selectBuilding: (item: LibraryItem) => void; // 라이브러리 아이템 선택
  isLoading: boolean;
  error: Error | null;
}

const BldgContext = createContext<BldgContextType | null>(null);

export const BldgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. 라이브러리 훅 호출 (데이터 로딩)
  const lib = useBldgLibrary();

  // 2. 시뮬레이션 훅 호출 (선택된 라이브러리 아이템 전달)
  const sim = useBldgSim(lib.selectedLibItem);

  // 3. 편집 종료 헬퍼 함수
  const finishEditing = useCallback(() => {
    sim.setSelectedBuildingId(null);
    sim.setMode('IDLE');
  }, [sim]);

  // 4. 건물 삭제 헬퍼 함수
  const removeBuilding = useCallback((id: string) => {
    sim.setBuildings(prev => prev.filter(b => b.id !== id));
    sim.setSelectedBuildingId(null);
  }, [sim]);

  // 5. 값 통합
  const value: BldgContextType = {
    // -- Library --
    libraryItems: lib.libraryItems,
    selectedLibItem: lib.selectedLibItem,
    selectBuilding: lib.selectBuilding, // (주의) 라이브러리 아이템 선택 함수
    isLoading: lib.isLoading,
    error: lib.error,

    // -- Sim --
    mode: sim.mode,
    setMode: sim.setMode,
    buildings: sim.buildings,
    setBuildings: sim.setBuildings,
    
    selectedBuilding: sim.selectedBuilding,
    selectedId: sim.selectedBuilding?.id || null, // Layer 호환
    setSelectedBuildingId: sim.setSelectedBuildingId,
    
    cursorPos: sim.cursorPos,
    setCursorPos: (pos) => sim.handleMouseMove(pos), // 래핑
    ghostBuilding: sim.ghostBuilding,
    
    inputs: sim.inputs,
    updateInput: sim.updateInput,
    rotation: sim.rotation,
    setRotation: sim.setRotation,
    
    updateBuilding: sim.updateBuilding,
    removeBuilding,
    finishEditing,
    
    handleMapClick: sim.handleMapClick,
    handleMouseMove: sim.handleMouseMove,
  };

  return (
    <BldgContext.Provider value={value}>
      {children}
    </BldgContext.Provider>
  );
};

export const useBldgContext = () => {
  const context = useContext(BldgContext);
  if (!context) {
    throw new Error('useBldgContext must be used within a BldgProvider');
  }
  return context;
};