import React, { createContext, useContext } from 'react';
import { useBldgSim } from '../hooks/useBldgSim';
import { useBldgLibrary } from '../hooks/useBldgLibrary';

// [Tip] Hook들의 반환 타입을 자동으로 추론하여 합칩니다.
// 이렇게 하면 Hook에서 새로운 기능을 추가해도 Context 타입을 일일이 수정할 필요가 없습니다.
type LibraryType = ReturnType<typeof useBldgLibrary>;
type SimType = ReturnType<typeof useBldgSim>;
type BldgContextType = LibraryType & SimType;

// any 대신 정확한 타입을 지정합니다.
const BldgContext = createContext<BldgContextType | null>(null);

export const BldgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const library = useBldgLibrary();
  const bldgSim = useBldgSim(library.selectedLibItem);

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