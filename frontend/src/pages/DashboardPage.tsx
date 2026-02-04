import React from 'react';
import { BaseMapLayout } from '@/features/map'; // 껍데기 (Viewer + UI)
import { BldgLayer } from '@/features/bldg';    // 알맹이 (3D 콘텐츠)

const DashboardPage: React.FC = () => {
  return (
    // BaseMapLayout이 Viewer를 제공하고, 그 안에 children으로 3D 요소들을 배치합니다.
    <BaseMapLayout>
      {/* 여기에 3D 레이어들을 위젯처럼 추가합니다 */}
      <BldgLayer />
      
      {/* 나중에 녹지 레이어가 생기면 여기에 추가: <GreenZoneLayer /> */}
    </BaseMapLayout>
  );
};

export default DashboardPage;