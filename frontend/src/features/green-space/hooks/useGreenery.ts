import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Cartesian3, Cartographic, Math as CesiumMath, 
  Transforms, HeadingPitchRoll 
} from 'cesium';
import * as turf from '@turf/turf';
import { fetchGreeneryLibrary } from '../api/greeneryApi'; 
import type { TreeItem, TreeConfig, GreeneryModel } from '../types';

export const useGreenery = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Cartesian3[]>([]);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [settings, setSettings] = useState({ coniferRatio: 0.5, density: 0.8 });
  
  // ✅ 1. 초기 설정 (침엽수는 좁게 3m, 활엽수는 넓게 6m로 설정)
  const [treeModels, setTreeModels] = useState<TreeConfig>({
    conifer: { mlid: 144, url: null, width: 3.0, depth: 3.0, area: 9.0, loaded: false },
    deciduous: { mlid: 148, url: null, width: 6.0, depth: 6.0, area: 36.0, loaded: false }
  });

  // 2. 모델 로드
  useEffect(() => {
    const loadModels = async () => {
      console.log("🚀 [useGreenery] 모델 목록 로딩...");
      try {
        const items: GreeneryModel[] = await fetchGreeneryLibrary();
        
        if (!items || items.length === 0) return;

        const findModel = (id: number) => items.find(i => Number(i.id) === id);
        
        // 144번(침엽수), 148번(활엽수) 찾기
        const cData = findModel(144) || items[0];
        const dData = findModel(148) || items[1] || items[0];

        const fixUrl = (model: GreeneryModel | undefined) => {
            if (!model?.modelUrl) return null;
            let url = model.modelUrl;
            if (!url.startsWith('/files') && !url.startsWith('http')) {
                url = `/files${url.startsWith('/') ? '' : '/'}${url}`;
            }
            return url;
        };

        const cUrl = fixUrl(cData);
        const dUrl = fixUrl(dData);

        // ✅ URL만 업데이트하고, 크기(width/depth)는 위에서 설정한 고정값(3m/6m)을 유지합니다.
        // (GLB 직접 분석은 에러 위험이 있어 제외했기 때문)
        setTreeModels(prev => ({
            conifer: { ...prev.conifer, mlid: Number(cData?.id), url: cUrl, loaded: true },
            deciduous: { ...prev.deciduous, mlid: Number(dData?.id), url: dUrl, loaded: true }
        }));

      } catch (e) { console.error("❌ 로드 에러:", e); }
    };
    loadModels();
  }, []); 

  // 면적 및 최대 수용량 계산
  const polygonArea = useMemo(() => {
    if (drawingPoints.length < 3) return 0;
    const coords = drawingPoints.map(p => {
      const c = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude)];
    });
    coords.push(coords[0]);
    return turf.area(turf.polygon([coords]));
  }, [drawingPoints]);

  const maxCapacity = useMemo(() => {
    if (polygonArea <= 0) return 0;
    // 비율에 따른 평균 점유 면적 계산
    const avgArea = (treeModels.conifer.area * settings.coniferRatio) + 
                    (treeModels.deciduous.area * (1 - settings.coniferRatio));
    return Math.floor(polygonArea / (avgArea || 25));
  }, [polygonArea, treeModels, settings.coniferRatio]);

  // 3. 나무 생성 로직
  const generateTrees = useCallback(() => {
    if (drawingPoints.length < 3) {
        alert("영역을 먼저 그려주세요.");
        return;
    }
    if (!treeModels.conifer.url) {
        alert("모델 로딩 중...");
        return;
    }

    try {
        const coords = drawingPoints.map(p => {
          const c = Cartographic.fromCartesian(p);
          return [CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude)];
        });
        coords.push(coords[0]);
        const poly = turf.polygon([coords]);
        const bbox = turf.bbox(poly);

        // ✅ [수정] 고정값 5.0 제거 -> 실제 모델 데이터와 비율 반영
        const weightedAvgWidth = (treeModels.conifer.width * settings.coniferRatio) + 
                                 (treeModels.deciduous.width * (1 - settings.coniferRatio));
        
        // 밀도(density)가 높을수록 간격(spacing)이 좁아짐
        const spacing = Math.max(1.5, weightedAvgWidth / Math.max(0.1, settings.density * 1.8)); 
        
        console.log(`📐 배치 간격 계산: ${spacing.toFixed(2)}m (평균폭: ${weightedAvgWidth.toFixed(2)}m)`);

        const grid = turf.pointGrid(bbox, spacing / 1000, { units: 'kilometers' });
        
        const pointsInside = grid.features.filter(f => turf.booleanPointInPolygon(f, poly));
        const limitedPoints = pointsInside.slice(0, 3000); // 성능 보호

        const newTrees = limitedPoints.map((f, i) => {
            const isConifer = Math.random() < settings.coniferRatio; 
            const model = isConifer ? treeModels.conifer : treeModels.deciduous;
            
            if (!model.url) return null;

            const [lon, lat] = f.geometry.coordinates;
            const finalPos = Cartesian3.fromDegrees(lon, lat, 0); 
            
            const hpr = new HeadingPitchRoll(Math.random() * CesiumMath.TWO_PI, 0, 0);
            const orientation = Transforms.headingPitchRollQuaternion(finalPos, hpr);

            return {
              id: `tree-${Date.now()}-${i}`,
              position: finalPos,
              type: isConifer ? 'CONIFER' : 'DECIDUOUS',
              modelUrl: model.url,
              scale: 1.0, 
              orientation: orientation
            } as TreeItem;
        }).filter((t): t is TreeItem => t !== null);

        console.log(`✅ 생성 완료: ${newTrees.length}그루`);
        setTrees(newTrees);
        setIsDrawing(false); // 그리기 모드 종료 -> 텍스처 전환 트리거

    } catch (err) { console.error(err); }
  }, [drawingPoints, settings, treeModels]);

  const reset = useCallback(() => {
      setTrees([]);
      setDrawingPoints([]);
      setIsDrawing(false);
  }, []);

  return { 
    isDrawing, setIsDrawing, drawingPoints, setDrawingPoints, 
    trees, generateTrees, settings, setSettings, 
    polygonArea, maxCapacity, treeModels, 
    estimatedCarbon: useMemo(() => (trees.length * 10.0), [trees]),
    reset
  };
};