import React from 'react';
import { BaseMapLayout } from '@/features/map';
import { BldgLayer } from '@/features/bldg/components/layer/BldgLayer';
import { BldgProvider } from '@/features/bldg/context/BldgContext';
import { BldgSimPanel } from '@/features/bldg/components/panel/BldgSimPanel';

// 녹지 관련
import { GreeneryLayer } from '@/features/green-space/components/layer/GreeneryLayer';
import { GreeneryProvider } from '@/features/green-space/context/GreeneryContext';
import { GreenerySimPanel } from '@/features/green-space/components/panel/GreenerySimPanel';

const DashboardPage: React.FC = () => {
  return (
    <BaseMapLayout>
      
      {/* 건물 */}
      <BldgProvider>
         <BldgLayer />
         <BldgSimPanel />
      </BldgProvider>

      {/* 녹지*/}
      <GreeneryProvider>
         <GreeneryLayer />
         <GreenerySimPanel />
      </GreeneryProvider>
      
    </BaseMapLayout>
  );
};

export default DashboardPage;