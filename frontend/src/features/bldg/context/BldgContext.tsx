import React, { createContext, useContext } from 'react';
import { useBldgSim } from '../hooks/useBldgSim';
import { useBldgLibrary } from '../hooks/useBldgLibrary';

const BldgContext = createContext<any>(null);

export const BldgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. 라이브러리 훅 (건물 목록, 선택)
  const library = useBldgLibrary();

  // 2. 시뮬레이션 훅 (배치, 편집, 삭제 등 모든 로직 포함)
  //    라이브러리에서 선택된 아이템(selectedLibItem)을 주입받습니다.
  const bldgSim = useBldgSim(library.selectedLibItem);

  // 3. 컨텍스트 값 통합
  const value = {
    ...library,
    ...bldgSim,
  };

  return (
    <BldgContext.Provider value={value}>
      {children}
    </BldgContext.Provider>
  );
};

export const useBldgContext = () => {
  const context = useContext(BldgContext);
  if (!context) {
    throw new Error('useBldgContext must be used within a BldgProvider');
  }
  return context;
};