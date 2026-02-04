import React, { useState } from 'react';
import { OverlayCard } from '@/components/ui';
import { useBldgSim } from '../hooks/useBldgSim';
import type { SimMode } from '../types';

export const BldgSimPanel: React.FC = () => {
  // 1. 패널 열림/닫힘 상태 (UI 전용 상태)
  const [isOpen, setIsOpen] = useState(true);

  // 2. 비즈니스 로직 훅 연결 (핵심!)
  const { 
    mode, setMode, inputs, updateInput, 
    isPlacing, startPlacement, 
    isConverting, handleConversion, convertedResult 
  } = useBldgSim();

  // 3. 탭 버튼 스타일링 헬퍼
  const tabClass = (target: SimMode) => 
    `flex-1 py-2 text-xs font-bold rounded transition-colors ${
      mode === target ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;

  // 4. 닫혀있을 때: '열기 버튼'만 렌더링
  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="absolute bottom-8 right-4 z-20 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-purple-700 transition transform hover:scale-105"
    >
      🛠️ 시뮬레이션 열기
    </button>
  );

  // 5. 열려있을 때: 'OverlayCard' 렌더링
  return (
    <div className="absolute bottom-8 right-4 z-20">
      <OverlayCard 
        title="🏗️ 편집 시뮬레이션" 
        onClose={() => setIsOpen(false)} 
        className="w-80 max-h-[80vh] overflow-y-auto" // 스크롤 가능하게 처리
      >
        
        {/* --- 모드 선택 탭 --- */}
        <div className="flex gap-1 mb-4 bg-gray-800 p-1 rounded">
          <button onClick={() => setMode('CREATE')} className={tabClass('CREATE')}>Box</button>
          <button onClick={() => setMode('UPLOAD')} className={tabClass('UPLOAD')}>GLB</button>
          <button onClick={() => setMode('CONVERT')} className={tabClass('CONVERT')}>3DS</button>
        </div>

        {/* --- 1. 박스 생성 모드 (CREATE) --- */}
        {mode === 'CREATE' && (
          <div className="space-y-3">
            {/* 가로 / 세로 입력 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">가로 (m)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={inputs.width} 
                  onChange={e => updateInput('width', Number(e.target.value))} 
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">세로 (m)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={inputs.depth} 
                  onChange={e => updateInput('depth', Number(e.target.value))} 
                />
              </div>
            </div>

            {/* 높이 입력 */}
            <div>
              <label className="text-xs text-gray-500 font-bold block mb-1">높이 (m)</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={inputs.height} 
                onChange={e => updateInput('height', Number(e.target.value))} 
              />
            </div>

            {/* 배치 시작 버튼 */}
            <button 
              onClick={startPlacement}
              className={`w-full py-3 rounded font-bold text-white shadow-md transition ${isPlacing ? 'bg-orange-500 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isPlacing ? "📍 지도 클릭하여 배치" : "🖱️ 배치 모드 시작"}
            </button>
          </div>
        )}

        {/* --- 2. 모델 업로드 모드 (UPLOAD) --- */}
        {mode === 'UPLOAD' && (
          <div className="space-y-3">
             <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
               * .glb 또는 .gltf 파일을 직접 업로드하여 배치합니다.
             </div>
             <input 
               type="file" 
               accept=".glb,.gltf"
               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
             />
             <button className="w-full bg-gray-400 text-white py-2 rounded font-bold text-xs cursor-not-allowed">
               (기능 준비 중)
             </button>
          </div>
        )}

        {/* --- 3. 변환 모드 (CONVERT) --- */}
        {mode === 'CONVERT' && (
          <div className="space-y-3">
             <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded leading-relaxed">
               * <span className="font-bold text-gray-700">.3ds</span> 파일과 텍스처(<span className="font-bold text-gray-700">.jpg, .png</span>)를 함께 선택하세요. (다중 선택 가능)
             </div>
             
             <input 
               type="file" 
               multiple 
               accept=".3ds,.jpg,.png"
               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
               onChange={(e) => e.target.files && handleConversion(Array.from(e.target.files))}
             />
             
             {/* 로딩 표시 */}
             {isConverting && (
               <div className="flex items-center justify-center p-4 text-orange-500 font-bold text-sm bg-orange-50 rounded">
                 <span className="animate-spin mr-2">⏳</span> 변환 중...
               </div>
             )}
             
             {/* 결과 표시 */}
             {convertedResult && (
               <div className="p-3 bg-green-50 border border-green-200 rounded text-center animate-fade-in">
                 <div className="text-green-700 font-bold text-sm mb-2">✅ 변환 성공!</div>
                 <div className="flex gap-2 justify-center">
                    <a 
                      href={convertedResult.url} 
                      download={convertedResult.filename} 
                      className="px-3 py-1 bg-white border border-green-300 rounded text-xs text-green-700 hover:bg-green-50"
                    >
                      다운로드
                    </a>
                    <button className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                      배치하기
                    </button>
                 </div>
               </div>
             )}
          </div>
        )}

      </OverlayCard>
    </div>
  );
};