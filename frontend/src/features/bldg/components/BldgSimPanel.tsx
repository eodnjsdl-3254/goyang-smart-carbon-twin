import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useBldgContext } from '../context/BldgContext';
import { useGreeneryContext } from '@/features/green-space';
import { convertScenarioToGeoJSON, downloadGeoJSON } from '../utils/scenarioExport';
import type { SimMode } from '../types';

export const BldgSimPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const { 
    mode, setMode, 
    inputs, updateInput, 
    setPendingFile,      
    isConverting, handleConversion, convertedResult,
    buildings 
  } = useBldgContext();

  const { trees } = useGreeneryContext();

  const handleSaveScenario = () => {
    if (buildings.length === 0 && trees.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    const geoJson = convertScenarioToGeoJSON(buildings, trees, "Goyang_Smart_Twin_Scenario");
    downloadGeoJSON(geoJson, "Goyang_Smart_Twin_Scenario");
  };

  const tabClass = (target: SimMode) => 
    `flex-1 py-2 text-[11px] font-bold rounded transition-all ${
      mode === target 
        ? 'bg-blue-600 text-white shadow-inner' 
        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
    }`;

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="absolute bottom-8 right-4 z-20 bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-2xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105"
    >
      🏢 시뮬레이션 도구 열기
    </button>
  );

  return (
    <div className="absolute bottom-8 right-4 z-20">
      <OverlayCard 
        title="🏗️ 건물 배치 시뮬레이션" 
        onClose={() => setIsOpen(false)} 
        className="w-80 border-t-4 border-blue-500 shadow-2xl"
      >
        {/* 모드 선택 탭 */}
        <div className="flex gap-1 mb-5 bg-gray-800 p-1 rounded-lg">
          <button onClick={() => setMode('CREATE')} className={tabClass('CREATE')}>박스 생성</button>
          <button onClick={() => setMode('UPLOAD')} className={tabClass('UPLOAD')}>모델 배치</button>
          <button onClick={() => setMode('CONVERT')} className={tabClass('CONVERT')}>3DS 변환</button>
        </div>

        {/* 1. 박스 생성 모드 (CREATE) */}
        {mode === 'CREATE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-tighter">가로 (Width)</label>
                {/* ✅ updateInput 연결 */}
                <input 
                  type="number" 
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none transition"
                  value={inputs.width} 
                  onChange={e => updateInput('width', Number(e.target.value))} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-tighter">세로 (Depth)</label>
                {/* ✅ updateInput 연결 */}
                <input 
                  type="number" 
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none transition"
                  value={inputs.depth} 
                  onChange={e => updateInput('depth', Number(e.target.value))} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-tighter">높이 (Height)</label>
              {/* ✅ updateInput 연결 */}
              <input 
                type="number" 
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-blue-500 outline-none transition"
                value={inputs.height} 
                onChange={e => updateInput('height', Number(e.target.value))} 
              />
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-100 text-[11px] text-blue-700 leading-tight">
               💡 <b>박스 배치:</b> 수치를 입력하고 지도를 클릭하세요.
            </div>
          </div>
        )}

        {/* 2. 모델 업로드 모드 (UPLOAD) */}
        {mode === 'UPLOAD' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="border-2 border-dashed border-gray-200 p-4 rounded-lg text-center hover:border-blue-400 transition cursor-pointer group relative">
              {/* ✅ setPendingFile 연결 */}
              <input 
                type="file" accept=".glb,.gltf" id="glb-upload" className="hidden"
                onChange={(e) => e.target.files && setPendingFile(e.target.files[0])}
              />
              <label htmlFor="glb-upload" className="cursor-pointer block">
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">📁</span>
                <span className="text-xs font-bold text-gray-600">.glb / .gltf 파일 선택</span>
              </label>
            </div>
            <p className="text-[10px] text-gray-400 text-center">* 모델 선택 후 지도를 클릭하여 배치하세요.</p>
          </div>
        )}

        {/* 3. 변환 모드 (CONVERT) */}
        {mode === 'CONVERT' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <input 
              type="file" multiple accept=".3ds,.jpg,.png"
              className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              onChange={(e) => e.target.files && handleConversion(Array.from(e.target.files))}
            />
            {isConverting && <div className="text-center py-4 text-orange-600 font-bold text-xs animate-pulse">⏳ 변환 중...</div>}
            {convertedResult && (
               <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 font-bold text-xs text-center">
                 ✅ {convertedResult.filename} 변환 완료
               </div>
            )}
          </div>
        )}

        {/* 통합 저장 버튼 */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button 
            onClick={handleSaveScenario}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
          >
            💾 통합 시나리오 저장 (GeoJSON)
          </button>
        </div>

      </OverlayCard>
    </div>
  );
};