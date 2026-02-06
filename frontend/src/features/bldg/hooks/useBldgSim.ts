import { useState, useCallback } from 'react';
import { useCesium } from 'resium';
import type { SimMode, SimInputs, BuildingProps } from '../types';
import { extractGlbDetails } from '../utils/glbParser';
import { convertScenarioToGeoJSON, downloadGeoJSON } from '../utils/scenarioExport';
import { convert3dsToGlb } from '../api/bldgApi';

export const useBldgSim = () => {  
  useCesium(); 
  
  const [mode, setMode] = useState<SimMode>('CREATE');
  const [buildings, setBuildings] = useState<BuildingProps[]>([]);
  const [inputs, setInputs] = useState<SimInputs>({
    width: 20, depth: 20, height: 50, rotation: 0, scale: 1.0
  });

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{url: string, filename: string} | null>(null);

  const updateInput = (key: keyof SimInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleConversion = async (files: File[]) => {
    if (files.length === 0) return;
    setIsConverting(true);
    try {
      const data = await convert3dsToGlb(files);
      setConvertedResult(data);
    } catch (e) {
      alert('변환 중 오류가 발생했습니다.');
      console.error(e);
    } finally {
      setIsConverting(false);
    }
  };

  const handleMapClick = useCallback(async (coords: { lat: number; lon: number }) => {
    if (mode === 'CREATE') {
      // missing originalWidth, originalDepth, originalHeight 추가
      const newBox: BuildingProps = {
        id: crypto.randomUUID(),
        ...coords,
        ...inputs,
        isModel: false,
        // 박스의 경우 현재 입력값이 곧 원본 크기가 됩니다.
        originalWidth: inputs.width,
        originalDepth: inputs.depth,
        originalHeight: inputs.height
      };
      setBuildings(prev => [...prev, newBox]);
    } 
    else if (mode === 'UPLOAD' && pendingFile) {
      const analysis = await extractGlbDetails(pendingFile);
      // missing originalWidth, originalDepth, originalHeight 추가
      const newModel: BuildingProps = {
        id: crypto.randomUUID(),
        ...coords,
        ...inputs,
        isModel: true,
        modelUrl: URL.createObjectURL(pendingFile),
        rootNodeName: analysis.geometry.rootNodeName,
        // GLB 분석 결과에서 얻은 실제 모델의 크기를 원본 크기로 저장합니다.
        originalWidth: analysis.geometry.width,
        originalDepth: analysis.geometry.depth,
        originalHeight: analysis.geometry.height
      };
      setBuildings(prev => [...prev, newModel]);
      setPendingFile(null);
    }
  }, [mode, inputs, pendingFile]);

  // convertScenarioToGeoJSON 사용 및 매개변수 불일치 해결
  const exportScenario = useCallback((name: string = "GSCT_Scenario") => {
    if (buildings.length === 0) {
      alert("배치된 건물이 없습니다.");
      return;
    }
    // 이 훅은 건물만 관리하므로 trees 자리에는 빈 배열([])을 넘겨줍니다.
    const geoJson = convertScenarioToGeoJSON(buildings, [], name);
    downloadGeoJSON(geoJson, name);
  }, [buildings]);

  return {
    mode, setMode, buildings, inputs, updateInput,
    pendingFile, setPendingFile, isConverting,
    handleConversion, convertedResult, handleMapClick,
    exportScenario, totalCount: buildings.length
  };
};