import React from 'react';
import { useBuildingController } from '../../hooks/controller/useBuildingController';
import type { SimMode } from '../../types';

export const LibraryTab: React.FC = () => {
  const { 
    mode, setMode, libraryItems, selectedLibItem, 
    startCreateModel, isLoading, error, inputs, updateInput, 
    rotation, setRotation, handleDownloadFile,
    handleUploadGlbAction, handleConvert3dsAction, isProcessing
  } = useBuildingController();

  const [uploadName, setUploadName] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const modeTabClass = (target: SimMode) => 
    `flex-1 py-2 text-[10px] font-bold rounded transition-all flex items-center justify-center gap-1 ${
      mode === target ? 'bg-blue-600 text-white shadow-lg ring-1 ring-white/10' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
    }`;

  return (
    <div className="animate-in fade-in slide-in-from-left-2 space-y-4">
      {/* 1. 모드 선택 버튼 */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-inner">
        <button onClick={() => setMode('LIBRARY')} className={modeTabClass('LIBRARY')}>🏢 모델</button>
        <button onClick={() => setMode('CREATE')} className={modeTabClass('CREATE')}>📦 박스</button>
        <button onClick={() => setMode('UPLOAD')} className={modeTabClass('UPLOAD')}>📁 업로드</button>
        <button onClick={() => setMode('CONVERT')} className={modeTabClass('CONVERT')}>🔄 3DS변환</button>
        <button onClick={() => setMode('IDLE')} className={modeTabClass('IDLE')}>👆 선택</button>
      </div>

      {/* 2. IDLE 모드 */}
      {mode === 'IDLE' && (
        <div className="py-12 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl text-center shadow-inner">
          <div className="text-3xl mb-3 opacity-20">👆</div>
          <p className="text-xs text-zinc-500 font-bold leading-relaxed px-6">지도 상의 건물을 클릭하여<br/>속성 편집을 시작하세요</p>
        </div>
      )}

      {/* 3. LIBRARY 모드 (리스트) */}
      {mode === 'LIBRARY' && (
        <div className="space-y-4">
            {error && <div className="text-red-400 text-[10px] bg-red-900/20 p-3 rounded-lg font-bold">{error.message}</div>}
            {isLoading ? (
               <div className="flex flex-col items-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div><span className="text-[11px] text-zinc-500 uppercase">Loading...</span></div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {libraryItems.map((item) => (
                    <div key={item.id} onClick={() => startCreateModel(item)} 
                      className={`group cursor-pointer p-1.5 rounded-2xl border transition-all ${
                        (selectedLibItem?.id === item.id) ? 'border-blue-500 bg-blue-500/10' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}>
                      <div className="h-12 bg-black/40 rounded-xl mb-2 flex items-center justify-center overflow-hidden border border-white/5">
                          {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover opacity-50 group-hover:opacity-100" alt={item.name}/> : <span className="text-xl">🏢</span>}
                      </div>
                      <p className="text-[9px] text-center font-black text-zinc-500 group-hover:text-zinc-300 truncate px-1">{item.name}</p>
                    </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-center text-zinc-500 italic py-2 bg-blue-500/5 rounded-xl border border-blue-500/10 animate-pulse">
              {selectedLibItem ? "📍 지도 위치를 클릭하여 배치하세요" : "목록에서 모델을 선택하세요"}
            </p>
        </div>
      )}

      {/* 4. CREATE 모드 (박스 설정) */}
      {mode === 'CREATE' && (
        <div className="space-y-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 shadow-inner animate-in zoom-in-95">
             <div className="flex items-center gap-2 mb-1 border-b border-zinc-800 pb-3">
               <span className="bg-blue-900/40 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Setup</span>
               <p className="text-[10px] font-black text-zinc-400 uppercase">Box Dimensions (m)</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
                {(['width', 'depth', 'height'] as const).map(key => (
                   <div key={key} className={key === 'height' ? 'col-span-2' : ''}>
                      <label className="text-[9px] text-zinc-500 font-black ml-1 uppercase">{key}</label>
                      <div className="relative mt-1">
                        <input type="number" className="w-full bg-zinc-950 p-2.5 border border-zinc-800 rounded-xl text-xs text-blue-400 outline-none" 
                          value={inputs[key]} onChange={e => updateInput(key, Number(e.target.value))} />
                        <span className="absolute right-3 top-3 text-[9px] text-zinc-700 font-bold">m</span>
                      </div>
                   </div>
                ))}
             </div>
             <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[10px] text-zinc-500 font-black uppercase"><span>Rotation</span><span className="text-blue-400">{Math.round(rotation || 0)}°</span></div>
                <input type="range" min="0" max="360" step="1" className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                   value={rotation || 0} onChange={(e) => setRotation(Number(e.target.value))} />
             </div>
             <div className="bg-indigo-900/10 p-3 rounded-2xl flex items-center gap-3 border border-indigo-500/10">
                <span className="text-xl animate-bounce">🖱️</span>
                <p className="text-[10px] text-indigo-400 font-bold leading-tight uppercase">지도 위를 클릭하여<br/>박스를 실시간 배치하세요</p>
             </div>
        </div>
      )}

      {/* 5. UPLOAD 모드 (GLB) */}
      {mode === 'UPLOAD' && (
        <div className="space-y-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 shadow-inner animate-in zoom-in-95">
             <div className="space-y-3">
                <label className="text-[9px] text-zinc-500 font-black uppercase ml-1">모델 이름</label>
                <input type="text" className="w-full bg-zinc-950 p-2.5 border border-zinc-800 rounded-xl text-xs text-white outline-none" 
                   placeholder="예: 현대 아파트 A동" value={uploadName} onChange={e => setUploadName(e.target.value)} />
                
                <label className="text-[9px] text-zinc-500 font-black uppercase ml-1">GLB 파일 선택</label>
                <input type="file" accept=".glb" className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-zinc-800 file:text-zinc-200"
                   onChange={e => setSelectedFile(e.target.files?.[0] || null)} />

                <button 
                  disabled={!selectedFile || !uploadName || isProcessing}
                  onClick={() => selectedFile && handleUploadGlbAction(selectedFile, uploadName)}
                  className="w-full bg-blue-600 disabled:bg-zinc-800 text-white py-3 rounded-xl font-bold text-xs shadow-lg transition-all"
                >
                  {isProcessing ? "⏳ 업로드 중..." : "🚀 업로드 시작"}
                </button>
             </div>
        </div>
      )}

      {/* 6. CONVERT 모드 (3DS) */}
      {mode === 'CONVERT' && (
        <div className="space-y-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 shadow-inner animate-in zoom-in-95">
             <div className="space-y-3">
                <label className="text-[9px] text-zinc-500 font-black uppercase ml-1">모델 이름</label>
                <input type="text" className="w-full bg-zinc-950 p-2.5 border border-zinc-800 rounded-xl text-xs text-white outline-none" 
                   placeholder="예: 3DS 변환 건물" value={uploadName} onChange={e => setUploadName(e.target.value)} />
                
                <label className="text-[9px] text-zinc-500 font-black uppercase ml-1">3DS 및 텍스처 파일들</label>
                <p className="text-[8px] text-zinc-600 mb-1 leading-tight">* .3ds 파일과 관련 이미지들을 함께 선택하세요.</p>
                <input type="file" multiple accept=".3ds,.jpg,.png" className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-zinc-800 file:text-zinc-200"
                   onChange={e => setSelectedFiles(Array.from(e.target.files || []))} />

                <button 
                  disabled={selectedFiles.length === 0 || !uploadName || isProcessing}
                  onClick={() => handleConvert3dsAction(selectedFiles, uploadName)}
                  className="w-full bg-purple-600 disabled:bg-zinc-800 text-white py-3 rounded-xl font-bold text-xs shadow-lg transition-all"
                >
                  {isProcessing ? "⏳ 변환 및 업로드 중..." : "🔄 변환 시작"}
                </button>
             </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-zinc-800">
          <button onClick={handleDownloadFile} className="w-full bg-zinc-900/50 text-zinc-400 py-3.5 rounded-2xl font-black text-xs hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800 flex items-center justify-center gap-3 active:scale-[0.98]">
            <span className="text-sm">💾</span> JSON 로컬 백업 (.json)
          </button>
      </div>
    </div>
  );
};