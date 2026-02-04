import React from 'react';
import { OverlayCard } from '@/components/ui';

export const BldgInfoCard: React.FC = () => {
  // 나중에 hooks/useBldgSelection.ts에서 상태를 가져올 예정
  const mockSelected = true; // 테스트용: true면 보이고 false면 안 보임

  if (!mockSelected) return null;

  return (
    <div className="absolute top-20 right-4 z-20">
      <OverlayCard title="🏢 건물 정보" onClose={() => console.log('닫기')}>
        <div className="space-y-2">
          <p><span className="font-semibold">명칭:</span> 고양시청 본관</p>
          <p><span className="font-semibold">높이:</span> 45m</p>
          <p><span className="font-semibold">탄소 배출량:</span> <span className="text-red-500 font-bold">높음</span></p>
          <hr className="my-2 border-gray-300"/>
          <button className="w-full bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 transition">
            상세 분석 보기
          </button>
        </div>
      </OverlayCard>
    </div>
  );
};