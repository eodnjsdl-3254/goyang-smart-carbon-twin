import React from 'react';
import type { BuildingProps } from '../../types';
import { useBuildingController } from '../../hooks/controller/useBuildingController';

export const EditTab: React.FC = () => {
  const { 
    selectedBuilding, updateBuilding, removeBuilding, finishEditing, 
    setMode, mode, getCalculatedDim 
  } = useBuildingController();

  if (!selectedBuilding) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 p-1">
      {/* 상단 ID 표시 */}
      <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/30 shadow-inner">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Building ID</span>
          <span className="text-[10px] text-zinc-500 cursor-pointer hover:text-red-400" onClick={finishEditing}>✖ 닫기</span>
        </div>
        <div className="font-mono text-[11px] font-bold text-zinc-300 break-all">
          {selectedBuilding.id.split('-')[0]}...
        </div>
      </div>

      <div className="space-y-4">
        {/* 회전 & 고도 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
             <span>🔄 회전각</span><span className="text-blue-400 font-black">{Math.round(selectedBuilding.rotation || 0)}°</span>
          </div>
          <input type="range" min="0" max="360" step="1" className="w-full h-1 bg-zinc-800 accent-blue-600 rounded-lg appearance-none cursor-pointer"
            value={selectedBuilding.rotation || 0}
            onChange={(e) => updateBuilding(selectedBuilding.id, { rotation: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
           <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
              <span>🛫 지면 높이</span><span className="text-green-400 font-black">{selectedBuilding.altitude || 0}m</span>
           </div>
           <input type="range" min="-10" max="100" step="1" className="w-full h-1 bg-zinc-800 accent-green-500 rounded-lg appearance-none cursor-pointer"
             value={selectedBuilding.altitude || 0}
             onChange={(e) => updateBuilding(selectedBuilding.id, { altitude: Number(e.target.value) })}
           />
        </div>

        {/* 스케일링 컨트롤러 (모델일 경우) */}
        {selectedBuilding.isModel && (
          <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 space-y-4 shadow-inner">
             <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scaling</p>
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
                 <input type="range" min="0.1" max="100" step="0.1" className={`w-full h-1 bg-zinc-800 ${item.color} rounded-lg appearance-none cursor-pointer`}
                   value={selectedBuilding[item.key as keyof BuildingProps] as number ?? 1}
                   onChange={(e) => updateBuilding(selectedBuilding.id, { [item.key]: Number(e.target.value) })}
                 />
               </div>
             ))}
          </div>
        )}

        {/* 박스 크기 입력 (박스일 경우) */}
        {!selectedBuilding.isModel && (
           <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 shadow-inner">
              {['width', 'depth', 'height'].map(k => (
                <div key={k}>
                  <label className="text-[9px] block text-zinc-500 font-black uppercase mb-1.5 ml-1">{k}</label>
                  <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-blue-400 outline-none" 
                    value={selectedBuilding[k as keyof BuildingProps] as number || 0} 
                    onChange={e => updateBuilding(selectedBuilding.id, { [k]: Number(e.target.value) })}
                  />
                </div>
              ))}
           </div>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
        <button onClick={() => setMode('RELOCATE')} className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${mode === 'RELOCATE' ? 'bg-orange-600 text-white animate-pulse' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'}`}>
          {mode === 'RELOCATE' ? "📍 위치 지정 중..." : "✥ 위치 이동"}
        </button>
        <div className="flex gap-2">
           <button onClick={() => removeBuilding(selectedBuilding.id)} className="flex-1 bg-red-900/20 text-red-500 py-2.5 rounded-xl text-xs font-bold hover:bg-red-900/40">🗑️ 삭제</button>
           <button onClick={finishEditing} className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl text-xs font-black hover:bg-blue-500 active:scale-95">편집 완료</button>
        </div>
      </div>
    </div>
  );
};