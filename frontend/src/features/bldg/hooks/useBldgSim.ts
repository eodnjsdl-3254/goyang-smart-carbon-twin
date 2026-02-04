import { useState, useCallback } from 'react';
import { useCesium } from 'resium';
import type { SimMode, SimInputs } from '../types';
import { convert3dsToGlb } from '../api/bldgApi';

export const useBldgSim = () => {
  const { viewer } = useCesium(); // Cesium Viewer 직접 접근
  const [mode, setMode] = useState<SimMode>('CREATE');
  const [inputs, setInputs] = useState<SimInputs>({
    width: 20, depth: 20, height: 50, rotation: 0, scale: 1.0
  });
  const [isPlacing, setIsPlacing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{url: string, filename: string} | null>(null);

  // 입력값 변경 핸들러
  const updateInput = (key: keyof SimInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // 3DS -> GLB 변환 요청
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

  // 배치 시작 (Cesium 상호작용 로직)
  const startPlacement = useCallback(() => {
    if (!viewer) return;
    setIsPlacing(true);
    console.log("배치 모드 시작:", inputs);
    // TODO: 여기에 ScreenSpaceEventHandler 등을 이용한 실제 배치 로직 구현
    // 기존 legacy 코드의 map.startBuildingPlacement 로직이 이곳에 들어갑니다.
  }, [viewer, inputs]);

  return {
    mode, setMode,
    inputs, updateInput,
    isPlacing, startPlacement,
    isConverting, handleConversion, convertedResult,
  };
};