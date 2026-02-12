import { useCallback, useMemo } from 'react';
import { useGreeneryContext } from '../../context/GreeneryContext';
import type { TreeItem } from '../../types';

export const useGreeneryController = () => {
  const ctx = useGreeneryContext();

  // 1. 그리기 모드 토글
  const toggleDrawing = useCallback(() => {
    if (ctx.isDrawing) {
      ctx.reset(); // 취소 시 초기화
    } else {
      ctx.setIsDrawing(true);
    }
  }, [ctx]);

  // 2. 시뮬레이션 실행
  const runSimulation = useCallback(() => {
    if (ctx.drawingPoints.length < 3) {
      alert("최소 3개 이상의 점을 찍어 영역을 만들어주세요.");
      return;
    }
    ctx.generateTrees();
  }, [ctx]);

  // 3. 초기화
  const resetAll = useCallback(() => {
    if (window.confirm("모든 녹지 데이터가 초기화됩니다. 계속하시겠습니까?")) {
      ctx.reset();
    }
  }, [ctx]);

  // 4. 통계 데이터 가공
  const stats = useMemo(() => {
    const safeArea = ctx.polygonArea || 0;
    const safeMax = ctx.maxCapacity || 0;
    
    // 실제 생성된 나무가 있으면 그 수, 없으면 밀도 기반 예상치
    const currentCount = ctx.trees.length > 0 
      ? ctx.trees.length 
      : Math.floor(safeMax * ctx.settings.density);
      
    return {
      area: safeArea,
      count: currentCount,
      carbon: currentCount * 10, // (예시) 그루당 연간 10kg 흡수
      coniferCount: ctx.trees.filter((t: TreeItem) => t.type === 'CONIFER').length,
      deciduousCount: ctx.trees.filter((t: TreeItem) => t.type === 'DECIDUOUS').length,
    };
  }, [ctx.polygonArea, ctx.maxCapacity, ctx.trees, ctx.settings.density]);

  return {
    // State
    isDrawing: ctx.isDrawing,
    hasDrawing: ctx.drawingPoints.length >= 3,
    hasTrees: ctx.trees.length > 0,
    settings: ctx.settings,
    treeModels: ctx.treeModels,
    
    // Data
    stats,

    // Actions
    setSettings: ctx.setSettings,
    toggleDrawing,
    runSimulation,
    resetAll,
  };
};