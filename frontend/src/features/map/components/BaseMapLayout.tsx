import React from 'react';
import { Viewer } from 'resium';
import { MapControlBar } from './MapControlBar';
import { BldgInfoCard, BldgSimPanel } from '@/features/bldg'; // 다른 기능의 컴포넌트 조합

interface Props {
  children?: React.ReactNode; // 건물 레이어 등을 주입받기 위함
}

export const BaseMapLayout: React.FC<Props> = ({ children }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 1. Cesium 지도 (Resium Viewer) */}
      <Viewer full>
        {children}
      </Viewer>

      {/* 2. 상단 제어 바 (Feature: Map) */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <MapControlBar />
      </div>

      {/* 3. 건물 정보 카드 (Feature: Bldg) - 조건부 렌더링은 내부에서 처리하거나 상위에서 제어 */}
      <BldgInfoCard />

      {/* 4. 시뮬레이션 패널 (Feature: Bldg) */}
      <BldgSimPanel />
    </div>
  );
};