import React from 'react';
import { BaseMapLayout } from '@/features/map';
import { BldgLayer } from '@/features/bldg/components/layer/BldgLayer';
import { BldgProvider } from '@/features/bldg/context/BldgContext';
import { BldgSimPanel } from '@/features/bldg/components/panel/BldgSimPanel';

// 녹지 관련
import { GreeneryLayer } from '@/features/green-space/components/layer/GreeneryLayer';
import { GreeneryProvider } from '@/features/green-space/context/GreeneryContext';
import { GreenerySimPanel } from '@/features/green-space/components/panel/GreenerySimPanel';

// ✅ Wrapper 불필요 (이제 간단하게 바로 사용 가능)
const DashboardPage: React.FC = () => {
  return (
    <BaseMapLayout>
      
      {/* 건물 */}
      <BldgProvider>
         <BldgLayer />
         <BldgSimPanel />
      </BldgProvider>

      {/* ✅ 녹지: viewer prop 없이 깔끔하게 사용 */}
      <GreeneryProvider>
         <GreeneryLayer />
         <GreenerySimPanel />
      </GreeneryProvider>
      
    </BaseMapLayout>
  );
};

export default DashboardPage;