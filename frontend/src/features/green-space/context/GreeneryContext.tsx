import React, { createContext, useContext } from 'react';
import { useGreenery } from '../hooks/useGreenery';

const GreeneryContext = createContext<ReturnType<typeof useGreenery> | null>(null);

export const GreeneryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useGreenery();
  return <GreeneryContext.Provider value={value}>{children}</GreeneryContext.Provider>;
};

export const useGreeneryContext = () => {
  const context = useContext(GreeneryContext);
  if (!context) throw new Error("useGreeneryContext must be used within GreeneryProvider");
  return context;
};