import React, { createContext, useContext } from 'react';
import { useBldgSim } from '../hooks/useBldgSim';
import { useBldgSelection } from '../hooks/useBldgSelection';

const BldgContext = createContext<any>(null);

export const BldgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bldgSim = useBldgSim();
  const bldgSelection = useBldgSelection();

  return (
    <BldgContext.Provider value={{ ...bldgSim, ...bldgSelection }}>
      {children}
    </BldgContext.Provider>
  );
};

export const useBldgContext = () => useContext(BldgContext);