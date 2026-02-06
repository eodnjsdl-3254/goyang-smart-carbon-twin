import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react'; 
import { useGreenery } from '../hooks/useGreenery';

// 컨텍스트에서 관리할 타입 정의
const GreeneryContext = createContext<ReturnType<typeof useGreenery> | null>(null);

export const GreeneryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // useGreenery 훅을 여기서 한 번만 호출하여 모든 하위 컴포넌트에 공유합니다.
  const value = useGreenery();

  return (
    <GreeneryContext.Provider value={value}>
      {children}
    </GreeneryContext.Provider>
  );
};

// 커스텀 훅: 컴포넌트에서 쉽게 컨텍스트 데이터를 가져오기 위함
export const useGreeneryContext = () => {
  const context = useContext(GreeneryContext);
  if (!context) {
    throw new Error('useGreeneryContext must be used within a GreeneryProvider');
  }
  return context;
};