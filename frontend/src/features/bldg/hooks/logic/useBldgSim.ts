// src/features/bldg/hooks/logic/useBldgSim.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { SimMode, SimInputs, BuildingProps, LibraryItem } from '../../types';

export const useBldgSim = (selectedLibItem: LibraryItem | null) => {
  const [mode, setMode] = useState<SimMode>('IDLE'); 
  const [buildings, setBuildings] = useState<BuildingProps[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{lat: number, lon: number} | null>(null);
  const [inputs, setInputs] = useState<SimInputs>({ width: 20, depth: 20, height: 30 });
  const [rotation, setRotation] = useState<number>(0); 

  const selectedBuilding = useMemo(() => 
    buildings.find(b => b.id === selectedBuildingId) || null
  , [buildings, selectedBuildingId]);

  // 선택된 건물이 바뀌면 회전각/입력값 동기화
  useEffect(() => {
    if (selectedBuilding) {
        if (!selectedBuilding.isModel) {
            setInputs({
                width: selectedBuilding.width || 20,
                depth: selectedBuilding.depth || 20,
                height: selectedBuilding.height || 30
            });
        }
        setRotation(selectedBuilding.rotation || 0);
    } else {
        // 선택 해제 시 초기화하지 않고 마지막 값 유지하거나 0으로 (정책에 따라 결정)
        // setRotation(0); 
    }
  }, [selectedBuildingId, selectedBuilding]);

  const updateBuilding = useCallback((id: string, updates: Partial<BuildingProps>) => {
    setBuildings(prev => prev.map(b => {
        if (b.id === id) {
            // 현재 선택된 건물을 수정 중이면 rotation 상태도 동기화
            if (updates.rotation !== undefined && id === selectedBuildingId) {
                setRotation(updates.rotation);
            }
            return { ...b, ...updates };
        }
        return b;
    }));
  }, [selectedBuildingId]);

  const updateInput = (key: keyof SimInputs, value: number) => {
    const numValue = Number(value);
    setInputs(prev => ({ ...prev, [key]: numValue }));
    // IDLE 모드에서 선택된 건물이 있으면 실시간 반영
    if (selectedBuildingId && mode === 'IDLE') {
        updateBuilding(selectedBuildingId, { [key]: numValue });
    }
  };

  const handleMapClick = useCallback((coords: { lat: number; lon: number }, pickedId?: string) => {
    if (mode === 'VIEW') return;

    // 1. 위치 이동 (Relocate)
    if (mode === 'RELOCATE' && selectedBuildingId) {
       updateBuilding(selectedBuildingId, { lat: coords.lat, lon: coords.lon });
       setMode('IDLE');
       return;
    }

    // 2. 생성 (Create/Library)
    if (mode === 'CREATE' || (mode === 'LIBRARY' && selectedLibItem)) {
      const isModel = mode === 'LIBRARY';
      const newBldg: BuildingProps = {
        id: crypto.randomUUID(),
        name: isModel ? selectedLibItem!.name : "Custom Box",
        ...coords,
        rotation: rotation, 
        altitude: 0, 
        isModel,
        modelUrl: isModel ? selectedLibItem!.modelUrl : undefined,
        width: isModel ? (selectedLibItem!.defaultWidth || 10) : inputs.width,
        depth: isModel ? (selectedLibItem!.defaultDepth || 10) : inputs.depth,
        height: isModel ? (selectedLibItem!.defaultHeight || 10) : inputs.height,
        originalHeight: isModel ? selectedLibItem!.defaultHeight : undefined,
        scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0, 
      };
      setBuildings(prev => [...prev, newBldg]);
      
      // 생성 후 선택 해제 및 초기화
      setSelectedBuildingId(null); 
      setMode('IDLE');
      setCursorPos(null);
    } 
    // 3. 일반 선택 (Idle)
    else if (mode === 'IDLE') {
       setSelectedBuildingId(pickedId || null);
    }
  }, [mode, inputs, selectedLibItem, selectedBuildingId, updateBuilding, rotation]);

  // 고스트 빌딩 로직 (마우스 따라다니는 미리보기)
  const ghostBuilding = useMemo(() => {
    if (!cursorPos) return null;

    if (mode === 'RELOCATE' && selectedBuilding) {
        return { ...selectedBuilding, ...cursorPos, id: 'ghost-relocate' };
    }

    if (mode === 'CREATE' || (mode === 'LIBRARY' && selectedLibItem)) {
        const isModel = mode === 'LIBRARY';
        return {
          id: 'ghost-preview',
          name: 'Preview',
          isModel,
          modelUrl: isModel ? selectedLibItem!.modelUrl : undefined,
          ...cursorPos,
          rotation: rotation, 
          altitude: 0,
          scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0, 
          width: isModel ? (selectedLibItem!.defaultWidth || 10) : inputs.width,
          depth: isModel ? (selectedLibItem!.defaultDepth || 10) : inputs.depth,
          height: isModel ? (selectedLibItem!.defaultHeight || 10) : inputs.height,
        } as BuildingProps;
    }
    return null;
  }, [cursorPos, mode, selectedLibItem, inputs, selectedBuilding, rotation]);

  return {
    mode, setMode, 
    buildings, setBuildings,
    selectedBuilding,
    selectedBuildingId,
    setSelectedBuildingId, // [중요] 이름 그대로 노출
    
    updateBuilding, 
    handleMapClick, 
    handleMouseMove: (c: any) => (['CREATE', 'LIBRARY', 'RELOCATE'].includes(mode)) && setCursorPos(c),
    
    cursorPos, 
    ghostBuilding,
    inputs, 
    updateInput,
    rotation, 
    setRotation,
  };
};