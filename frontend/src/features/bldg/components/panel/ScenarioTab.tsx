import React, { useState, useEffect } from 'react';
import { useBuildingController } from '../../hooks/controller/useBuildingController';

export const ScenarioTab: React.FC = () => {
  const [sceneNameInput, setSceneNameInput] = useState('');
  const { sceneLogic } = useBuildingController();
  const { sceneList, loadList, handleSave, handleLoad, loading } = sceneLogic;

  // 탭 진입 시 리스트 로드
  useEffect(() => { loadList(); }, []);

  const onSaveToDB = async () => {
    if (!sceneNameInput.trim()) { alert("이름을 입력하세요."); return; }
    await handleSave(sceneNameInput);
    setSceneNameInput('');
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
        <div className="bg-green-900/10 p-4 rounded-3xl border border-green-500/20 shadow-inner">
          <p className="text-[10px] font-black text-green-500 mb-3 uppercase tracking-widest font-mono">Scenario Management (DB)</p>
          <div className="flex gap-2">
              <input type="text" placeholder="시나리오 이름..." 
                className="flex-1 bg-black/40 p-2.5 text-xs border border-zinc-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-green-500"
                value={sceneNameInput} onChange={(e) => setSceneNameInput(e.target.value)}
              />
              <button onClick={onSaveToDB} disabled={loading}
                className="bg-green-700 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-green-600 disabled:opacity-30 active:scale-95">
                {loading ? '...' : '저장'}
              </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-l-2 border-blue-500 pl-2">DB 저장 목록</p>
              <button onClick={loadList} className="text-[9px] text-blue-400 font-black hover:text-blue-300 uppercase">🔄 Refresh</button>
          </div>
          
          <div className="h-[280px] overflow-y-auto border border-zinc-800 rounded-2xl bg-black/20 p-2 custom-scrollbar shadow-inner">
              {loading && sceneList.length === 0 ? (
                  <div className="flex justify-center items-center h-full opacity-40"><span className="text-[10px] font-bold uppercase">Loading...</span></div>
              ) : sceneList.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-[11px] text-zinc-600 italic">저장된 시나리오 없음</div>
              ) : (
                  <div className="space-y-1.5">
                    {sceneList.map((scene) => (
                        <div key={scene.scene_id} className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 transition-all flex justify-between items-center group">
                            <div className="overflow-hidden">
                              <p className="text-xs font-black text-zinc-300 truncate pr-4 group-hover:text-white">{scene.scene_name}</p>
                              <p className="text-[9px] text-zinc-600 mt-1 font-bold">{new Date(scene.reg_date).toLocaleDateString()} | {scene.user_id}</p>
                            </div>
                            <button onClick={() => handleLoad(scene.scene_id)}
                              className="bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white border border-blue-500/20 active:scale-90">
                              LOAD
                            </button>
                        </div>
                    ))}
                  </div>
              )}
          </div>
        </div>
    </div>
  );
};