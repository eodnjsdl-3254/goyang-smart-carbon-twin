import { useState, useCallback, useMemo, useEffect } from 'react';
import type { SimMode, SimInputs, BuildingProps, LibraryItem } from '../types';

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
        setRotation(0);
    }
  }, [selectedBuildingId, selectedBuilding]);

  const updateBuilding = useCallback((id: string, updates: Partial<BuildingProps>) => {
    setBuildings(prev => prev.map(b => {
        if (b.id === id) {
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
    if (selectedBuildingId && mode === 'IDLE') {
        updateBuilding(selectedBuildingId, { [key]: numValue });
    }
  };

  const handleMapClick = useCallback((coords: { lat: number; lon: number }, pickedId?: string) => {
    if (mode === 'VIEW') return;

    if (mode === 'RELOCATE' && selectedBuildingId) {
       updateBuilding(selectedBuildingId, { lat: coords.lat, lon: coords.lon });
       setMode('IDLE');
       return;
    }

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
        // [중요] 라이브러리 모델의 기본 크기 처리
        width: isModel ? (selectedLibItem!.defaultWidth || 10) : inputs.width,
        depth: isModel ? (selectedLibItem!.defaultDepth || 10) : inputs.depth,
        height: isModel ? (selectedLibItem!.defaultHeight || 10) : inputs.height,
        // 원본 높이 저장 (라벨 표시용)
        originalHeight: isModel ? selectedLibItem!.defaultHeight : undefined,
        scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0, 
      };
      setBuildings(prev => [...prev, newBldg]);
      
      setSelectedBuildingId(null); // 선택 해제
      setMode('IDLE');
      setCursorPos(null);
    } 
    else if (mode === 'IDLE') {
       setSelectedBuildingId(pickedId || null);
       if(pickedId) {
           const target = buildings.find(b => b.id === pickedId);
           if(target) setRotation(target.rotation || 0);
       }
    }
  }, [mode, inputs, selectedLibItem, selectedBuildingId, updateBuilding, rotation, buildings]);

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
          // 라이브러리일 경우 default 값 사용, 아니면 입력값 사용
          width: isModel ? (selectedLibItem!.defaultWidth || 10) : inputs.width,
          depth: isModel ? (selectedLibItem!.defaultDepth || 10) : inputs.depth,
          height: isModel ? (selectedLibItem!.defaultHeight || 10) : inputs.height,
          originalHeight: isModel ? selectedLibItem!.defaultHeight : undefined,
        } as BuildingProps;
    }
    return null;
  }, [cursorPos, mode, selectedLibItem, inputs, selectedBuilding, rotation]);

  return {
    mode, setMode, 
    buildings, setBuildings,
    updateBuilding, handleMapClick, 
    handleMouseMove: (c: any) => (mode === 'CREATE' || mode === 'LIBRARY' || mode === 'RELOCATE') && setCursorPos(c),
    cursorPos, ghostBuilding,
    selectedBuilding,
    selectBuildingObj: setSelectedBuildingId,
    setSelectedBuildingId, 
    inputs, updateInput,
    rotation, setRotation,
    removeBuilding: (id: string) => {
        setBuildings(prev => prev.filter(b => b.id !== id));
        setSelectedBuildingId(null);
    },
    finishEditing: () => { setSelectedBuildingId(null); setMode('IDLE'); setCursorPos(null); }
  };
};