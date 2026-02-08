import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useBldgContext } from '../context/BldgContext';
import { useGreeneryContext } from '@/features/green-space';
import { convertScenarioToGeoJSON, downloadGeoJSON } from '../utils/scenarioExport';
import type { SimMode, LibraryItem, BuildingProps } from '../types';

export const BldgSimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { 
    mode, setMode, 
    inputs, updateInput, 
    buildings,
    libraryItems, selectedLibItem, selectBuilding, isLoading, error,
    selectedBuilding, updateBuilding, removeBuilding, finishEditing 
  } = useBldgContext();

  const { trees } = useGreeneryContext();

  // 실제 치수 계산 로직 (BldgInfoCard와 동일하게 적용)
  const getCalculatedDim = (axis: 'X' | 'Y' | 'Z') => {
    if (!selectedBuilding) return "0.0";
    const original = axis === 'X' ? selectedBuilding.originalWidth : axis === 'Y' ? selectedBuilding.originalDepth : selectedBuilding.originalHeight;
    const scale = axis === 'X' ? selectedBuilding.scaleX : axis === 'Y' ? selectedBuilding.scaleY : selectedBuilding.scaleZ;
    
    if (original === undefined) return "...";
    return (original * (scale ?? 1)).toFixed(1);
  };

  const handleSaveScenario = () => {
    if (buildings.length === 0 && trees.length === 0) {
      alert("데이터가 없습니다."); return;
    }
    const fileName = `GSCT_Scenario_${new Date().toISOString().slice(0,10)}`;
    const geoJson = convertScenarioToGeoJSON(buildings, trees, fileName);
    downloadGeoJSON(geoJson, fileName);
  };

  const tabClass = (target: SimMode) => 
    `flex-1 py-2 text-[11px] font-bold rounded transition-all flex items-center justify-center gap-1 ${
      mode === target 
        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1' 
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    }`;

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="absolute bottom-8 right-4 z-20 bg-blue-600 text-white px-4 py-3 rounded-full shadow-xl font-bold hover:bg-blue-700 transition-transform hover:scale-105 flex items-center gap-2"
    >
      <span>🏗️</span> 시뮬레이터 열기
    </button>
  );

  return (
    <div className="absolute bottom-8 right-4 z-20">
      <OverlayCard 
        title={selectedBuilding ? "✏️ 건물 속성 편집" : "🏗️ 건물 배치 시뮬레이션"}
        onClose={() => { setIsOpen(false); finishEditing(); }} 
        className="w-80 shadow-2xl border-t-4 border-blue-500"
      >
        
        {/* ======================= [편집 모드] ======================= */}
        {selectedBuilding ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-blue-500 font-bold uppercase">Building ID</span>
                <span className="text-[10px] text-gray-400 cursor-pointer hover:text-red-500" onClick={finishEditing}>✖ 닫기</span>
              </div>
              <div className="font-mono text-xs font-bold text-gray-700 break-all">{selectedBuilding.id.split('-')[0]}...</div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-500 font-bold"><span>🔄 회전</span><span>{Math.round(selectedBuilding.rotation || 0)}°</span></div>
                <input type="range" min="0" max="360" step="1" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={selectedBuilding.rotation || 0}
                  onChange={(e) => updateBuilding(selectedBuilding.id, { rotation: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-500 font-bold"><span>🛫 고도</span><span>{selectedBuilding.altitude || 0}m</span></div>
                <input type="range" min="-10" max="100" step="1" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  value={selectedBuilding.altitude || 0}
                  onChange={(e) => updateBuilding(selectedBuilding.id, { altitude: Number(e.target.value) })}
                />
              </div>

              {/* 모델 전용: 배율 조절 */}
              {selectedBuilding.isModel && (
                <div className="bg-gray-50 p-2 rounded space-y-2 border border-gray-100">
                   <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Size Scaling</p>
                      <button 
                        onClick={() => updateBuilding(selectedBuilding.id, { scaleX: 1, scaleY: 1, scaleZ: 1 })}
                        className="text-[9px] text-blue-500 hover:underline"
                      >
                        초기화 (1.0x)
                      </button>
                   </div>
                   {[
                     { label: '가로 (X)', key: 'scaleX', axis: 'X' as const, color: 'accent-blue-500' },
                     { label: '세로 (Y)', key: 'scaleY', axis: 'Y' as const, color: 'accent-blue-500' },
                     { label: '높이 (Z)', key: 'scaleZ', axis: 'Z' as const, color: 'accent-red-500' }
                   ].map((item) => (
                     <div key={item.key}>
                        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
                          <span>{item.label}</span>
                          <span className="font-bold text-blue-600">
                            {(selectedBuilding[item.key as keyof BuildingProps] as number ?? 1).toFixed(1)}x 
                            <span className="text-gray-400 ml-1">({getCalculatedDim(item.axis)}m)</span>
                          </span>
                        </div>
                        <input type="range" min="0.1" max="10" step="0.1" className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${item.color} bg-gray-300`}
                          value={selectedBuilding[item.key as keyof BuildingProps] as number ?? 1}
                          onChange={(e) => updateBuilding(selectedBuilding.id, { [item.key]: Number(e.target.value) })}
                        />
                     </div>
                   ))}
                </div>
              )}

              {/* 박스 전용: 치수 입력 */}
              {!selectedBuilding.isModel && (
                <div className="grid grid-cols-3 gap-2">
                   <div><label className="text-[9px] block text-gray-400 font-bold uppercase">Width</label><input type="number" className="w-full p-1 border rounded text-xs focus:ring-1 focus:ring-blue-400" value={selectedBuilding.width} onChange={e => updateBuilding(selectedBuilding.id, { width: Number(e.target.value) })}/></div>
                   <div><label className="text-[9px] block text-gray-400 font-bold uppercase">Depth</label><input type="number" className="w-full p-1 border rounded text-xs focus:ring-1 focus:ring-blue-400" value={selectedBuilding.depth} onChange={e => updateBuilding(selectedBuilding.id, { depth: Number(e.target.value) })}/></div>
                   <div><label className="text-[9px] block text-gray-400 font-bold uppercase">Height</label><input type="number" className="w-full p-1 border rounded text-xs focus:ring-1 focus:ring-blue-400" value={selectedBuilding.height} onChange={e => updateBuilding(selectedBuilding.id, { height: Number(e.target.value) })}/></div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <button 
                onClick={() => setMode('RELOCATE')} 
                className={`w-full py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 ${mode === 'RELOCATE' ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'}`}
              >
                {mode === 'RELOCATE' ? "📍 지도 클릭하여 이동" : "✥ 위치 이동"}
              </button>
              <div className="flex gap-2">
                 <button onClick={() => removeBuilding(selectedBuilding.id)} className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded text-xs font-bold hover:bg-red-100">🗑️ 삭제</button>
                 <button onClick={finishEditing} className="flex-[2] bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 shadow-md">완료</button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================= [기본 모드] ======================= */
          <>
            <div className="flex gap-2 mb-4 p-1 bg-gray-50 rounded-lg border border-gray-200">
              <button onClick={() => setMode('IDLE')} className={tabClass('IDLE')}>👆 선택</button>
              <button onClick={() => setMode('LIBRARY')} className={tabClass('LIBRARY')}>🏢 라이브러리</button>
              <button onClick={() => setMode('CREATE')} className={tabClass('CREATE')}>📦 박스</button>
            </div>

            {mode === 'IDLE' && (
              <div className="p-8 bg-blue-50/50 border border-dashed border-blue-200 rounded-xl text-center">
                <div className="text-3xl mb-2 opacity-50">👆</div>
                <p className="text-xs text-blue-800 font-bold">지도에서 건물을 클릭하여<br/>속성을 편집하세요</p>
              </div>
            )}

            {mode === 'LIBRARY' && (
              <div className="space-y-3">
                 {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded">{error.message}</div>}
                 {isLoading ? (
                   <div className="flex flex-col items-center py-8">
                     <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                     <span className="text-[10px] text-gray-400">라이브러리 로드 중...</span>
                   </div>
                 ) : (
                   <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto p-1 scrollbar-hide">
                     {libraryItems.map((item: LibraryItem) => (
                       <div 
                        key={item.id} 
                        onClick={() => selectBuilding(item)} 
                        className={`group cursor-pointer p-2 rounded-lg border transition-all ${selectedLibItem?.id === item.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm'}`}
                       >
                          <div className="h-10 bg-gray-50 rounded mb-1 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                             {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" alt={item.name}/> : <span className="text-lg">🏢</span>}
                          </div>
                          <p className="text-[9px] text-center font-bold text-gray-600 truncate">{item.name}</p>
                       </div>
                     ))}
                   </div>
                 )}
                 <p className="text-[10px] text-center text-gray-400 italic">
                   {selectedLibItem ? "📍 배치를 원하는 지도 위치를 클릭하세요" : "배치할 모델을 선택하세요"}
                 </p>
              </div>
            )}

            {mode === 'CREATE' && (
              <div className="space-y-3 p-1">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Setup</span>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Box Dimensions (m)</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 font-bold">가로 (WIDTH)</label>
                      <div className="relative">
                        <input type="number" className="w-full p-2 border rounded-lg text-xs pr-6" 
                          value={inputs.width} 
                          onChange={e => updateInput('width', Number(e.target.value))} 
                        />
                        <span className="absolute right-2 top-2 text-[9px] text-gray-300">m</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 font-bold">세로 (DEPTH)</label>
                      <div className="relative">
                        <input type="number" className="w-full p-2 border rounded-lg text-xs pr-6" 
                          value={inputs.depth} 
                          onChange={e => updateInput('depth', Number(e.target.value))} 
                        />
                        <span className="absolute right-2 top-2 text-[9px] text-gray-300">m</span>
                      </div>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-bold">높이 (HEIGHT)</label>
                    <div className="relative">
                      <input type="number" className="w-full p-2 border rounded-lg text-xs pr-6" 
                        value={inputs.height} 
                        onChange={e => updateInput('height', Number(e.target.value))} 
                      />
                      <span className="absolute right-2 top-2 text-[9px] text-gray-300">m</span>
                    </div>
                 </div>
                 <div className="bg-indigo-50 p-2 rounded-lg flex items-center gap-2">
                    <span className="animate-pulse">🖱️</span>
                    <p className="text-[10px] text-indigo-600 font-bold">지도 위를 클릭하여 박스를 배치하세요</p>
                 </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
               <button 
                onClick={handleSaveScenario} 
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
               >
                 <span>💾</span> 시나리오 저장 (GeoJSON)
               </button>
            </div>
          </>
        )}
      </OverlayCard>
    </div>
  );
};