// src/features/bldg/components/panel/BldgSimPanel.tsx
import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useBuildingController } from '../../hooks/controller/useBuildingController';

// 하위 컴포넌트 import
import { EditTab } from './EditTab';
import { LibraryTab } from './LibraryTab';
import { ScenarioTab } from './ScenarioTab';

export const BldgSimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'SCENARIO'>('EDIT'); 
  
  // 🔥 모든 로직은 Controller Hook에 위임
  const ctrl = useBuildingController();

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="absolute bottom-8 right-4 z-20 bg-zinc-900/90 text-white px-5 py-3 rounded-full shadow-2xl font-bold hover:bg-zinc-800 transition-all border border-white/10 backdrop-blur-md flex items-center gap-2"
    >
      <span className="text-lg">🏗️</span> <span className="text-xs">건물 배치 시뮬레이터</span>
    </button>
  );

  return (
    <div className="absolute bottom-8 right-4 z-20">
      <OverlayCard 
        title={ctrl.isEditMode ? "✏️ 건물 속성 편집" : "🏗️ 건물 배치 시뮬레이션"}
        onClose={() => { setIsOpen(false); ctrl.finishEditing(); }} 
        className="w-80 shadow-2xl border-t-4 border-blue-500 bg-zinc-950/95 backdrop-blur-xl text-zinc-100"
      >
        {/* 1. 편집 모드일 때: EditTab 표시 */}
        {ctrl.isEditMode ? (
          <EditTab />
        ) : (
          <div className="p-1 space-y-4">
            {/* 2. 일반 모드일 때: 상단 탭 버튼 */}
            <div className="flex border-b border-zinc-800 mb-3 bg-black/20 rounded-t-lg">
                <button 
                  className={`flex-1 py-2.5 text-xs font-bold transition-all ${activeTab === 'EDIT' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                  onClick={() => setActiveTab('EDIT')}
                >
                  🛠️ 배치/편집
                </button>
                <button 
                  className={`flex-1 py-2.5 text-xs font-bold transition-all ${activeTab === 'SCENARIO' ? 'text-green-500 border-b-2 border-green-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                  onClick={() => setActiveTab('SCENARIO')}
                >
                  📂 시나리오 (DB)
                </button>
            </div>

            {/* 3. 탭 내용 */}
            {activeTab === 'EDIT' && <LibraryTab />}
            {activeTab === 'SCENARIO' && <ScenarioTab />}
          </div>
        )}
      </OverlayCard>
    </div>
  );
};