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
  
  // ✅ 1. 초기 설정 (침엽수: 144번, 활엽수: 148번)
  const [treeModels, setTreeModels] = useState<TreeConfig>({
    conifer: { mlid: 144, url: null, width: 5.0, depth: 5.0, area: 25.0, loaded: false },
    deciduous: { mlid: 148, url: null, width: 5.0, depth: 5.0, area: 25.0, loaded: false }
  });

  // ✅ 2. 모델 로드 (분석 없이 URL만 매핑)
  useEffect(() => {
    const loadModels = async () => {
      console.log("🚀 [useGreenery] 모델 목록 로딩...");
      try {
        const items: GreeneryModel[] = await fetchGreeneryLibrary();
        
        if (!items || items.length === 0) {
            console.warn("⚠️ 모델 데이터 없음");
            return;
        }

        const findModel = (id: number) => items.find(i => Number(i.id) === id);
        
        // 침엽수(144) / 활엽수(148) 찾기
        const cData = findModel(144) || items[0];
        const dData = findModel(148) || items[1] || items[0];

        // URL 경로 보정 헬퍼
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

        console.log("✨ 모델 매핑 완료:", { conifer: cUrl, deciduous: dUrl });

        setTreeModels(prev => ({
            conifer: { ...prev.conifer, mlid: Number(cData?.id), url: cUrl, loaded: true },
            deciduous: { ...prev.deciduous, mlid: Number(dData?.id), url: dUrl, loaded: true }
        }));

      } catch (e) { console.error("❌ 모델 로드 에러:", e); }
    };
    loadModels();
  }, []); 

  // 면적 및 수용량 계산
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
    const avgArea = (treeModels.conifer.area + treeModels.deciduous.area) / 2;
    return Math.floor(polygonArea / (avgArea || 25));
  }, [polygonArea, treeModels]);

  // ✅ 3. 나무 생성 로직 (단순화됨)
  const generateTrees = useCallback(() => {
    console.log("🌲 나무 생성 시작...");
    
    if (drawingPoints.length < 3) {
        alert("최소 3개의 점을 찍어 영역을 만들어주세요.");
        return;
    }
    // 모델 URL 체크
    if (!treeModels.conifer.url) {
        alert("모델 데이터를 불러오는 중입니다. 잠시 후 시도해주세요.");
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

        const avgWidth = 5.0; // 고정값 사용 (분석 제거했으므로)
        const spacing = Math.max(1.5, avgWidth / Math.max(0.1, settings.density * 1.5)); 
        const grid = turf.pointGrid(bbox, spacing / 1000, { units: 'kilometers' });
        
        const pointsInside = grid.features.filter(f => turf.booleanPointInPolygon(f, poly));
        const limitedPoints = pointsInside.slice(0, 3000); 

        const newTrees = limitedPoints.map((f, i) => {
            const isConifer = Math.random() < settings.coniferRatio; 
            const modelUrl = isConifer 
                ? (treeModels.conifer.url || "") 
                : (treeModels.deciduous.url || "");
            
            if (!modelUrl) return null;

            const [lon, lat] = f.geometry.coordinates;
            const finalPos = Cartesian3.fromDegrees(lon, lat, 0); // 높이 0 (ClampToGround)
            
            const hpr = new HeadingPitchRoll(Math.random() * CesiumMath.TWO_PI, 0, 0);
            const orientation = Transforms.headingPitchRollQuaternion(finalPos, hpr);

            return {
              id: `tree-${Date.now()}-${i}`,
              position: finalPos,
              type: isConifer ? 'CONIFER' : 'DECIDUOUS',
              modelUrl: modelUrl,
              scale: 1.0, // ✅ 크기 보정 없이 1.0 고정
              orientation: orientation
            } as TreeItem;
        }).filter((t): t is TreeItem => t !== null);

        console.log(`✅ 생성 완료: ${newTrees.length}그루`);
        setTrees(newTrees);
        setIsDrawing(false);

    } catch (err) {
        console.error("🔥 생성 오류:", err);
    }
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