import { useState, useCallback, useMemo } from 'react';
import type { SimMode, SimInputs, BuildingProps, LibraryItem } from '../types';

export const useBldgSim = (selectedLibItem: LibraryItem | null) => {
  const [mode, setMode] = useState<SimMode>('VIEW'); 
  const [buildings, setBuildings] = useState<BuildingProps[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{lat: number, lon: number} | null>(null);
  const [inputs, setInputs] = useState<SimInputs>({ width: 20, depth: 20, height: 30 });

  const updateInput = (key: keyof SimInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const updateBuilding = useCallback((id: string, updates: Partial<BuildingProps>) => {
    setBuildings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const handleMapClick = useCallback((coords: { lat: number; lon: number }, pickedId?: string) => {
    if (mode === 'VIEW') return;
    if (mode === 'IDLE') {
       setSelectedBuildingId(pickedId || null);
       return;
    }
    if (mode === 'RELOCATE' && selectedBuildingId) {
       updateBuilding(selectedBuildingId, { lat: coords.lat, lon: coords.lon });
       setMode('IDLE');
       return;
    }

    if ((mode === 'LIBRARY' && selectedLibItem) || mode === 'CREATE') {
      const isModel = mode === 'LIBRARY';
      const newBldg: BuildingProps = {
        id: crypto.randomUUID(),
        name: isModel ? selectedLibItem!.name : "Custom Box",
        ...coords,
        rotation: 0, altitude: 0, isModel,
        modelUrl: isModel ? selectedLibItem!.modelUrl : undefined,
        width: isModel ? (selectedLibItem!.defaultWidth || 10) : inputs.width,
        depth: isModel ? (selectedLibItem!.defaultDepth || 10) : inputs.depth,
        height: isModel ? (selectedLibItem!.defaultHeight || 10) : inputs.height,
        scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0, 
      };
      setBuildings(prev => [...prev, newBldg]);
      setSelectedBuildingId(newBldg.id);
      setMode('IDLE');
      setCursorPos(null);
    }
  }, [mode, inputs, selectedLibItem, selectedBuildingId, updateBuilding]);

  const ghostBuilding = useMemo(() => {
    if (!cursorPos || mode === 'VIEW' || mode === 'IDLE' || mode === 'RELOCATE') return null;
    const isLib = mode === 'LIBRARY' && selectedLibItem;
    return {
      id: 'ghost',
      name: isLib ? selectedLibItem.name : 'Preview Box',
      isModel: isLib,
      modelUrl: isLib ? selectedLibItem.modelUrl : undefined,
      ...cursorPos,
      rotation: 0, altitude: 0,
      scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0,
      width: isLib ? (selectedLibItem.defaultWidth || 10) : inputs.width,
      depth: isLib ? (selectedLibItem.defaultDepth || 10) : inputs.depth,
      height: isLib ? (selectedLibItem.defaultHeight || 10) : inputs.height,
    } as BuildingProps;
  }, [cursorPos, mode, selectedLibItem, inputs]);

  return {
    mode, setMode, buildings, updateBuilding, handleMapClick, 
    handleMouseMove: (c: any) => (mode !== 'VIEW' && mode !== 'IDLE') && setCursorPos(c),
    cursorPos, ghostBuilding,
    selectedBuilding: buildings.find(b => b.id === selectedBuildingId) || null,
    setSelectedBuildingId, 
    selectBuildingObj: setSelectedBuildingId,
    inputs, updateInput,
    removeBuilding: (id: string) => setBuildings(prev => prev.filter(b => b.id !== id)),
    finishEditing: () => { setSelectedBuildingId(null); setMode('VIEW'); setCursorPos(null); }
  };
};