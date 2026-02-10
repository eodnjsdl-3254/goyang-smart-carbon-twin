import React, { useState, useEffect } from 'react';
import { OverlayCard } from '@/components/ui';
import { useBldgContext } from '../context/BldgContext';
import { useGreeneryContext } from '@/features/green-space';
import { convertScenarioToGeoJSON, downloadGeoJSON } from '../utils/scenarioExport';
import { useBldgScene } from '../hooks/useBldgScene';
import type { SimMode, LibraryItem, BuildingProps } from '../types';

export const BldgSimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'SCENARIO'>('EDIT'); 
  const [sceneNameInput, setSceneNameInput] = useState('');

  const { 
    mode, setMode, 
    inputs, updateInput, 
    buildings, setBuildings, 
    libraryItems, selectedLibItem, selectBuilding, isLoading, error,
    selectedBuilding, updateBuilding, removeBuilding, finishEditing,
    rotation, setRotation 
  } = useBldgContext();

  const { trees } = useGreeneryContext();

  const { 
    sceneList, loadList, handleSave, handleLoad, loading: sceneLoading 
  } = useBldgScene(buildings, setBuildings);

  useEffect(() => {
    if (isOpen && activeTab === 'SCENARIO') {
      loadList();
    }
  }, [isOpen, activeTab]);

  const getCalculatedDim = (axis: 'X' | 'Y' | 'Z') => {
    if (!selectedBuilding) return "0.0";
    const original = axis === 'X' ? selectedBuilding.originalWidth : axis === 'Y' ? selectedBuilding.originalDepth : selectedBuilding.originalHeight;
    const scale = axis === 'X' ? selectedBuilding.scaleX : axis === 'Y' ? selectedBuilding.scaleY : selectedBuilding.scaleZ;
    
    if (original === undefined) return "...";
    return (original * (scale ?? 1)).toFixed(1);
  };

  const handleDownloadFile = () => {
    if (buildings.length === 0 && trees.length === 0) {
      alert("데이터가 없습니다."); return;
    }
    const fileName = `GSCT_Scenario_${new Date().toISOString().slice(0,10)}`;
    const geoJson = convertScenarioToGeoJSON(buildings, trees, fileName);
    downloadGeoJSON(geoJson, fileName);
  };

  const onSaveToDB = async () => {
    if (!sceneNameInput.trim()) {
      alert("시나리오 이름을 입력해주세요."); return;
    }
    await handleSave(sceneNameInput);
    setSceneNameInput('');
  };

  const modeTabClass = (target: SimMode) => 
    `flex-1 py-2 text-[11px] font-bold rounded transition-all flex items-center justify-center gap-1 ${
      mode === target 
        ? 'bg-blue-600 text-white shadow-lg ring-1 ring-white/10' 
        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
    }`;

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
        title={selectedBuilding ? "✏️ 건물 속성 편집" : "🏗️ 건물 배치 시뮬레이션"}
        onClose={() => { setIsOpen(false); finishEditing(); }} 
        className="w-80 shadow-2xl border-t-4 border-blue-500 bg-zinc-950/95 backdrop-blur-xl text-zinc-100"
      >
        {!selectedBuilding && (
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
        )}

        {selectedBuilding ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 p-1">
            <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/30 shadow-inner">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Building ID</span>
                <span className="text-[10px] text-zinc-500 cursor-pointer hover:text-red-400" onClick={finishEditing}>✖ 닫기</span>
              </div>
              <div className="font-mono text-[11px] font-bold text-zinc-300 break-all">{selectedBuilding.id.split('-')[0]}...</div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold"><span>🔄 회전각</span><span className="text-blue-400 font-black">{Math.round(selectedBuilding.rotation || 0)}°</span></div>
                <input type="range" min="0" max="360" step="1" className="w-full h-1 bg-zinc-800 accent-blue-600 rounded-lg appearance-none cursor-pointer"
                  value={selectedBuilding.rotation || 0}
                  onChange={(e) => updateBuilding(selectedBuilding.id, { rotation: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold"><span>🛫 지면 높이 (Altitude)</span><span className="text-green-400 font-black">{selectedBuilding.altitude || 0}m</span></div>
                <input type="range" min="-10" max="100" step="1" className="w-full h-1 bg-zinc-800 accent-green-500 rounded-lg appearance-none cursor-pointer"
                  value={selectedBuilding.altitude || 0}
                  onChange={(e) => updateBuilding(selectedBuilding.id, { altitude: Number(e.target.value) })}
                />
              </div>

              {selectedBuilding.isModel && (
                <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 space-y-4 shadow-inner">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scaling Controller</p>
                      <button onClick={() => updateBuilding(selectedBuilding.id, { scaleX: 1, scaleY: 1, scaleZ: 1 })} className="text-[9px] text-blue-500 font-bold hover:text-blue-400">초기화</button>
                    </div>
                    {[
                      { label: '가로 (X)', key: 'scaleX', axis: 'X' as const, color: 'accent-blue-500' },
                      { label: '세로 (Y)', key: 'scaleY', axis: 'Y' as const, color: 'accent-blue-500' },
                      { label: '높이 (Z)', key: 'scaleZ', axis: 'Z' as const, color: 'accent-red-500' }
                    ].map((item) => (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between text-[9px] text-zinc-400 font-bold">
                          <span>{item.label}</span>
                          <span className="text-zinc-200">
                            {(selectedBuilding[item.key as keyof BuildingProps] as number ?? 1).toFixed(1)}x 
                            <span className="text-zinc-600 ml-1 font-normal">({getCalculatedDim(item.axis)}m)</span>
                          </span>
                        </div>
                        <input type="range" min="0.1" max="10" step="0.1" className={`w-full h-1 bg-zinc-800 ${item.color} rounded-lg appearance-none cursor-pointer`}
                          value={selectedBuilding[item.key as keyof BuildingProps] as number ?? 1}
                          onChange={(e) => updateBuilding(selectedBuilding.id, { [item.key]: Number(e.target.value) })}
                        />
                      </div>
                    ))}
                </div>
              )}

              {!selectedBuilding.isModel && (
                <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 shadow-inner">
                    {['width', 'depth', 'height'].map(k => (
                      <div key={k}>
                        <label className="text-[9px] block text-zinc-500 font-black uppercase mb-1.5 ml-1">{k}</label>
                        <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-blue-400 focus:ring-1 focus:ring-blue-500 outline-none" 
                          value={selectedBuilding[k as keyof BuildingProps] as number || 0} 
                          onChange={e => updateBuilding(selectedBuilding.id, { [k]: Number(e.target.value) })}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <button 
                onClick={() => setMode('RELOCATE')} 
                className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${mode === 'RELOCATE' ? 'bg-orange-600 text-white animate-pulse shadow-lg' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20'}`}
              >
                {mode === 'RELOCATE' ? "📍 위치 지정 중..." : "✥ 위치 이동"}
              </button>
              <div className="flex gap-2">
                  <button onClick={() => removeBuilding(selectedBuilding.id)} className="flex-1 bg-red-900/20 text-red-500 border border-red-500/20 py-2.5 rounded-xl text-xs font-bold hover:bg-red-900/40 transition-colors">🗑️ 삭제</button>
                  <button onClick={finishEditing} className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl text-xs font-black hover:bg-blue-500 shadow-xl active:scale-95 transition-all">편집 완료</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-1 space-y-4">
            {activeTab === 'EDIT' && (
              <div className="animate-in fade-in slide-in-from-left-2 space-y-4">
                <div className="flex gap-1 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-inner">
                  <button onClick={() => setMode('IDLE')} className={modeTabClass('IDLE')}>👆 선택</button>
                  <button onClick={() => setMode('LIBRARY')} className={modeTabClass('LIBRARY')}>🏢 모델</button>
                  <button onClick={() => setMode('CREATE')} className={modeTabClass('CREATE')}>📦 박스</button>
                </div>

                {mode === 'IDLE' && (
                  <div className="py-12 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl text-center shadow-inner">
                    <div className="text-3xl mb-3 opacity-20">👆</div>
                    <p className="text-xs text-zinc-500 font-bold leading-relaxed px-6">지도의 시뮬레이션 건물을 클릭하여<br/>정밀 속성 편집을 시작하세요</p>
                  </div>
                )}

                {mode === 'LIBRARY' && (
                  <div className="space-y-4">
                      {error && <div className="text-red-400 text-[10px] bg-red-900/20 p-3 rounded-lg border border-red-900/30 font-bold">{error.message}</div>}
                      {isLoading ? (
                        <div className="flex flex-col items-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div><span className="text-[11px] text-zinc-500 font-bold tracking-widest uppercase">Fetching Assets...</span></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                          {libraryItems.map((item: LibraryItem) => (
                              <div 
                                key={item.id} 
                                onClick={() => { selectBuilding(item); setMode('LIBRARY'); }} 
                                className={`group cursor-pointer p-1.5 rounded-2xl border transition-all ${
                                  (mode === 'LIBRARY' && selectedLibItem?.id === item.id) 
                                    ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                <div className="h-12 bg-black/40 rounded-xl mb-2 flex items-center justify-center overflow-hidden border border-white/5">
                                    {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt={item.name}/> : <span className="text-xl">🏢</span>}
                                </div>
                                <p className="text-[9px] text-center font-black text-zinc-500 group-hover:text-zinc-300 truncate px-1">{item.name}</p>
                              </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-center text-zinc-500 italic py-2 bg-blue-500/5 rounded-xl border border-blue-500/10 animate-pulse">
                        {selectedLibItem ? "📍 배치를 원하는 지도 위치를 클릭하세요" : "배치할 모델을 목록에서 선택하세요"}
                      </p>
                  </div>
                )}

                {mode === 'CREATE' && (
                  <div className="space-y-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 shadow-inner animate-in zoom-in-95">
                      <div className="flex items-center gap-2 mb-1 border-b border-zinc-800 pb-3">
                        <span className="bg-blue-900/40 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase border border-blue-800/30 shadow-sm">Setup</span>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dimension Settings (m)</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-500 font-black ml-1 uppercase">Width</label>
                          <div className="relative">
                            <input type="number" className="w-full bg-zinc-950 p-2.5 border border-zinc-800 rounded-xl text-xs text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" 
                              value={inputs.width} 
                              onChange={e => updateInput('width', Number(e.target.value))} 
                            />
                            <span className="absolute right-3 top-3 text-[9px] text-zinc-700 font-bold">m</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-500 font-black ml-1 uppercase">Depth</label>
                          <div className="relative">
                            <input type="number" className="w-full bg-zinc-950 p-2.5 border border-zinc-800 rounded-xl text-xs text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" 
                              value={inputs.depth} 
                              onChange={e => updateInput('depth', Number(e.target.value))} 
                            />
                            <span className="absolute right-3 top-3 text-[9px] text-zinc-700 font-bold">m</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-black ml-1 uppercase">Height</label>
                        <div className="relative">
                          <input type="number" className="w-full bg-zinc-950 p-2.5 border border-zinc-800 rounded-xl text-xs text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" 
                            value={inputs.height} 
                            onChange={e => updateInput('height', Number(e.target.value))} 
                          />
                          <span className="absolute right-3 top-3 text-[9px] text-zinc-700 font-bold">m</span>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-[10px] text-zinc-500 font-black tracking-widest uppercase">
                            <span>Rotation</span>
                            <span className="text-blue-400">{Math.round(rotation || 0)}°</span>
                        </div>
                        <input type="range" min="0" max="360" step="1" className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-sm"
                          value={rotation || 0}
                          onChange={(e) => setRotation(Number(e.target.value))} 
                        />
                      </div>
                      <div className="bg-indigo-900/10 p-3 rounded-2xl flex items-center gap-3 border border-indigo-500/10 shadow-sm">
                        <span className="text-xl animate-bounce">🖱️</span>
                        <p className="text-[10px] text-indigo-400 font-bold leading-tight uppercase tracking-tight">지도 위를 클릭하여<br/>박스를 실시간 배치하세요</p>
                      </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-zinc-800">
                    <button 
                      onClick={handleDownloadFile} 
                      className="w-full bg-zinc-900/50 text-zinc-400 py-3.5 rounded-2xl font-black text-xs hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                      <span className="text-sm">💾</span> JSON 파일 로컬 백업 (.json)
                    </button>
                </div>
              </div>
            )}

            {activeTab === 'SCENARIO' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                  <div className="bg-green-900/10 p-4 rounded-3xl border border-green-500/20 shadow-inner">
                    <p className="text-[10px] font-black text-green-500 mb-3 uppercase tracking-widest font-mono">Scenario Management (DB)</p>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="저장할 시나리오 이름..." 
                          className="flex-1 bg-black/40 p-2.5 text-xs border border-zinc-800 rounded-xl text-white focus:ring-1 focus:ring-green-500 outline-none placeholder:text-zinc-700 transition-all shadow-inner"
                          value={sceneNameInput}
                          onChange={(e) => setSceneNameInput(e.target.value)}
                        />
                        <button 
                          onClick={onSaveToDB}
                          disabled={sceneLoading}
                          className="bg-green-700 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-green-600 disabled:opacity-30 transition-all shadow-lg active:scale-95"
                        >
                          {sceneLoading ? '...' : '저장'}
                        </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-l-2 border-blue-500 pl-2">DB 저장 목록</p>
                        <button onClick={loadList} className="text-[9px] text-blue-400 font-black hover:text-blue-300 transition-colors uppercase tracking-tighter">🔄 Refresh List</button>
                    </div>
                    
                    <div className="h-[280px] overflow-y-auto border border-zinc-800 rounded-2xl bg-black/20 p-2 custom-scrollbar shadow-inner">
                        {sceneLoading && sceneList.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full gap-3 opacity-40"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div><span className="text-[10px] font-bold uppercase tracking-widest">Loading DB...</span></div>
                        ) : sceneList.length === 0 ? (
                            <div className="flex justify-center items-center h-full text-[11px] text-zinc-600 font-bold italic tracking-tight">저장된 시나리오가 존재하지 않습니다.</div>
                        ) : (
                            <div className="space-y-1.5">
                              {sceneList.map((scene) => (
                                  <div key={scene.scene_id} className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 transition-all flex justify-between items-center group shadow-sm">
                                      <div className="overflow-hidden">
                                        <p className="text-xs font-black text-zinc-300 truncate pr-4 group-hover:text-white transition-colors">{scene.scene_name}</p>
                                        <p className="text-[9px] text-zinc-600 mt-1 font-bold">{new Date(scene.reg_date).toLocaleDateString()} | {scene.user_id}</p>
                                      </div>
                                      <button 
                                        onClick={() => handleLoad(scene.scene_id)}
                                        className="bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20 active:scale-90 shadow-sm"
                                      >
                                        LOAD
                                      </button>
                                  </div>
                              ))}
                            </div>
                        )}
                    </div>
                  </div>
              </div>
            )}
          </div>
        )}
      </OverlayCard>
    </div>
  );
};