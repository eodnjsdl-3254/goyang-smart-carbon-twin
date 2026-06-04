import { useCallback, useState } from 'react';
import { useBldgContext } from '../../context/BldgContext';
import { useGreeneryContext } from '@/features/green-space';
import { convertScenarioToGeoJSON, downloadGeoJSON } from '../../utils/scenarioExport';
import { useBldgScene } from '../logic/useBldgScene'; 
import { uploadGlb, convert3dsToGlb } from '../../api/bldgApi';
import type { LibraryItem } from '../../types';

export const useBuildingController = () => {
  const ctx = useBldgContext();
  const { trees } = useGreeneryContext();
  
  const [isProcessing, setIsProcessing] = useState(false);

  // 시나리오 관련 로직
  const sceneLogic = useBldgScene(ctx.buildings, ctx.setBuildings);

  // 1. JSON 다운로드
  const handleDownloadFile = useCallback(() => {
    if (ctx.buildings.length === 0 && trees.length === 0) {
      alert("데이터가 없습니다."); return;
    }
    const fileName = `GSCT_Scenario_${new Date().toISOString().slice(0,10)}`;
    const geoJson = convertScenarioToGeoJSON(ctx.buildings, trees, fileName);
    downloadGeoJSON(geoJson, fileName);
  }, [ctx.buildings, trees]);

  // 2. 치수 계산 헬퍼
  const getCalculatedDim = useCallback((axis: 'X' | 'Y' | 'Z') => {
    const b = ctx.selectedBuilding;
    if (!b) return "0.0";
    const original = axis === 'X' ? b.originalWidth : axis === 'Y' ? b.originalDepth : b.originalHeight;
    const scale = axis === 'X' ? b.scaleX : axis === 'Y' ? b.scaleY : b.scaleZ;
    
    if (original === undefined) return "...";
    return (original * (scale ?? 1)).toFixed(1);
  }, [ctx.selectedBuilding]);

  // 3. [박스 생성] 모드 시작
  const startCreateBox = useCallback(() => {
    ctx.setSelectedBuildingId(null); // [수정됨] 명칭 통일
    ctx.setMode('CREATE');
  }, [ctx]);

  // 4. [모델 생성] 모드 시작
  const startCreateModel = useCallback((item: LibraryItem) => {
    ctx.selectLibraryItem(item); // [수정됨] 명칭 통일
    ctx.setMode('LIBRARY');
  }, [ctx]);

  // 5. [위치 이동] 시작
  const startRelocate = useCallback(() => {
    if (!ctx.selectedBuilding) {
      alert("이동할 건물을 먼저 선택해주세요.");
      return;
    }
    ctx.setMode('RELOCATE');
  }, [ctx]);

  // 6. [삭제] (Confirm 포함)
  const safeRemove = useCallback((id: string) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      ctx.removeBuilding(id);
    }
  }, [ctx]);

  // 7. GLB 업로드 실행
  const handleUploadGlbAction = useCallback(async (file: File, name: string) => {
    setIsProcessing(true);
    try {
      const response = await uploadGlb(file, name);
      alert("모델이 성공적으로 업로드되었습니다.");
      
      // 라이브러리 갱신 및 데이터 수신
      const updatedList = await ctx.refreshLibrary();
      
      // 방금 생성된 ID와 일치하는 아이템 찾아 즉시 선택
      const newItem = updatedList.find(item => item.id === String(response.model_id));
      if (newItem) {
        ctx.selectLibraryItem(newItem);
        ctx.setMode('LIBRARY'); // 모델 탭으로 전환하여 배치 유도
      }
    } catch (err) {
      alert("업로드 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
    } finally {
      setIsProcessing(false);
    }
  }, [ctx]);

  // 8. 3DS 변환 실행
  const handleConvert3dsAction = useCallback(async (files: File[], name: string) => {
    setIsProcessing(true);
    try {
      const response = await convert3dsToGlb(files, name);
      alert("변환 및 업로드가 완료되었습니다. 파일을 다운로드합니다.");
      
      // [신규] 변환된 GLB 파일 자동 다운로드 로직
      if (response.url) {
        const link = document.createElement('a');
        link.href = response.url;
        link.download = `${name || 'converted_model'}.glb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 라이브러리 갱신 및 데이터 수신
      const updatedList = await ctx.refreshLibrary();
      
      // 방금 변환된 아이템 찾아 즉시 선택
      const newItem = updatedList.find(item => item.id === String(response.model_id));
      if (newItem) {
        ctx.selectLibraryItem(newItem);
        ctx.setMode('LIBRARY');
      }
    } catch (err) {
      alert("변환 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
    } finally {
      setIsProcessing(false);
    }
  }, [ctx]);

  return {
    ...ctx,
    sceneLogic,
    handleDownloadFile,
    getCalculatedDim,
    
    // Actions
    startCreateBox,
    startCreateModel,
    startRelocate,
    safeRemove,
    handleUploadGlbAction,
    handleConvert3dsAction,
    
    // Status
    isProcessing,
    isEditMode: !!ctx.selectedBuilding,
  };
};