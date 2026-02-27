import React, { createContext, useContext, useCallback } from 'react';
import { useBldgLibrary } from '../hooks/logic/useBldgLibrary'; 
import { useBldgSim } from '../hooks/logic/useBldgSim';
import type { BldgContextType } from '../types';

const BldgContext = createContext<BldgContextType | null>(null);

export const BldgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. 라이브러리 Hook
  const lib = useBldgLibrary();

  // 2. 시뮬레이션 Hook (선택된 라이브러리 아이템 전달)
  const sim = useBldgSim(lib.selectedLibItem);

  // 3. 헬퍼 함수 정의
  const removeBuilding = useCallback((id: string) => {
    sim.setBuildings(prev => prev.filter(b => b.id !== id));
    sim.setSelectedBuildingId(null);
  }, [sim]);

  const finishEditing = useCallback(() => {
    sim.setSelectedBuildingId(null);
    sim.setMode('IDLE');
  }, [sim]);

  // 4. 값 매핑 (Interface와 일치시켜야 함)
  const value: BldgContextType = {
    // -- Library --
    libraryItems: lib.libraryItems,
    selectedLibItem: lib.selectedLibItem,
    
    // lib.selectBuilding -> lib.selectLibraryItem
    selectLibraryItem: lib.selectLibraryItem, 
    
    isLoading: lib.isLoading,
    error: lib.error,

    // -- Sim --
    mode: sim.mode,
    setMode: sim.setMode,
    buildings: sim.buildings,
    setBuildings: sim.setBuildings,
    
    selectedBuilding: sim.selectedBuilding,
    selectedId: sim.selectedBuildingId,
    setSelectedBuildingId: sim.setSelectedBuildingId,
    
    cursorPos: sim.cursorPos,
    setCursorPos: (pos) => sim.handleMouseMove(pos), // 타입 호환용 래퍼
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
  if (!context) throw new Error('useBldgContext must be used within a BldgProvider');
  return context;
};