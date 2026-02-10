import React, { createContext, useContext } from 'react';
import { useGreenery } from '../hooks/useGreenery';

// Hook 반환 타입 추론
const GreeneryContext = createContext<ReturnType<typeof useGreenery> | null>(null);

// ✅ viewer prop 제거 (이제 필요 없음!)
export const GreeneryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // ✅ 인자 없이 훅 호출
  const value = useGreenery(); 

  return (
    <GreeneryContext.Provider value={value}>
      {children}
    </GreeneryContext.Provider>
  );
};

export const useGreeneryContext = () => {
  const context = useContext(GreeneryContext);
  if (!context) throw new Error("useGreeneryContext must be used within GreeneryProvider");
  return context;
};