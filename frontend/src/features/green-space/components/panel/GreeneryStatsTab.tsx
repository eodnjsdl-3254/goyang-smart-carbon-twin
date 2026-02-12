import React from 'react';
import { useGreeneryController } from '../../hooks/controller/useGreeneryController';

export const GreeneryStatsTab: React.FC = () => {
  // Controller에서 통계와 모델 정보를 가져옵니다.
  const { stats, treeModels } = useGreeneryController();

  return (
    <div className="space-y-2">
      {/* 1. 기본 통계 (면적/수량) */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-white/5 p-2.5 rounded-lg text-center border border-white/10">
          <p className="text-zinc-500 font-bold mb-1 uppercase tracking-tighter">대상지 면적</p>
          <p className="text-sm font-black text-orange-400">
            {stats.area > 0 ? `${Math.round(stats.area).toLocaleString()} m²` : "-"}
          </p>
        </div>
        <div className="bg-white/5 p-2.5 rounded-lg text-center border border-white/10">
          <p className="text-zinc-500 font-bold mb-1 uppercase tracking-tighter">식재 수량</p>
          <p className="text-sm font-black text-blue-400">
            {stats.area > 0 ? `${stats.count.toLocaleString()} 그루` : "-"}
          </p>
        </div>
      </div>

      {/* 2. 모델 실측 정보 */}
      <div className="text-[10px] text-zinc-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold">모델 실측 정보</span>
          <span className={treeModels.conifer.loaded ? "text-green-400" : "text-yellow-500"}>
            {treeModels.conifer.loaded ? "✅ 완료" : "⚠️ 기본값"}
          </span>
        </div>
        <p className="flex justify-between border-t border-white/5 pt-1 mt-1">
          <span>🌲 침엽수: {(treeModels.conifer.width * treeModels.conifer.depth).toFixed(1)}m² (폭 {treeModels.conifer.width}m)</span>
          <span>🌳 활엽수: {(treeModels.deciduous.width * treeModels.deciduous.depth).toFixed(1)}m² (폭 {treeModels.deciduous.width}m)</span>
        </p>
      </div>
    </div>
  );
};