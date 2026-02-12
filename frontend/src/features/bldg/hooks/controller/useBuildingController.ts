// src/features/bldg/hooks/controller/useBuildingController.ts
import { useCallback } from 'react';
import { useBldgContext } from '../../context/BldgContext';
import { useGreeneryContext } from '@/features/green-space';
import { convertScenarioToGeoJSON, downloadGeoJSON } from '../../utils/scenarioExport';
import { useBldgScene } from '../logic/useBldgScene'; 
import type { LibraryItem } from '../../types';

export const useBuildingController = () => {
  const ctx = useBldgContext();
  const { trees } = useGreeneryContext();
  
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
    
    // Helpers
    isEditMode: !!ctx.selectedBuilding,
  };
};