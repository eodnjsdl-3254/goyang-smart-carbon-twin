import { useState, useCallback } from 'react';
import type { BuildingProps } from '../types';

export const useBldgSelection = () => {
  const [selectedBldg, setSelectedBldg] = useState<BuildingProps | null>(null);

  // 건물을 선택하거나 해제하는 함수
  const selectBldg = useCallback((bldg: BuildingProps | null) => {
    setSelectedBldg(bldg);
    if (bldg) {
      console.log(`🎯 건물 선택됨: ${bldg.id}`);
    }
  }, []);

  return { selectedBldg, selectBldg };
};