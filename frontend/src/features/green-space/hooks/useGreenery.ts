import { useState, useCallback, useMemo, useEffect } from 'react';
import { Cartesian3, Cartographic, Math as CesiumMath } from 'cesium';
import * as turf from '@turf/turf';
import { fetchBuildingLibrary } from '../../bldg/api/bldgApi'; 
import type { TreeItem, TreeConfig, LibraryItem } from '../types'; 
// [추가] 방금 만든 유틸리티 import
import { getGlbDimensions } from '../utils/glibUtils'; 

export const useGreenery = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Cartesian3[]>([]);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  
  // 1. 나무 모델 설정
  const [treeModels, setTreeModels] = useState<TreeConfig>({
    conifer: { mlid: 143, url: null, width: 5.0, area: 25.0, loaded: false },
    deciduous: { mlid: 148, url: null, width: 5.0, area: 25.0, loaded: false }
  });

  const [settings, setSettings] = useState({
    coniferRatio: 0.5,
    density: 0.5,
  });

  // 2. 백엔드 모델 정보 가져오기 + [추가] GLB 크기 분석
  useEffect(() => {
    let isMounted = true; 

    const loadModels = async () => {
      try {
        const items: LibraryItem[] = await fetchBuildingLibrary();
        if (!isMounted) return;

        // DB 매칭
        const coniferItem = items.find(i => Number(i.id) === 143 || i.category === 'conifer' || i.name.includes('pine'));
        const deciduousItem = items.find(i => Number(i.id) === 148 || i.category === 'deciduous' || i.name.includes('oak'));

        // [핵심] GLB 파일이 있다면 다운로드해서 실제 크기 측정
        const updateModelSpec = async (item: LibraryItem | undefined, currentConfig: any) => {
            if (!item || !item.modelUrl) return currentConfig;

            let realWidth = item.defaultWidth || 5.0;
            let realArea = realWidth * (item.defaultDepth || 5.0);

            // GLB URL이 있으면 실제 크기 분석 시도
            if (item.modelUrl) {
                const dims = await getGlbDimensions(item.modelUrl);
                if (dims) {
                    realWidth = dims.width;
                    realArea = dims.area; // (width * depth)
                }
            }

            return {
                ...currentConfig,
                mlid: Number(item.id),
                url: item.modelUrl,
                width: realWidth,
                area: realArea, // [변경] 실제 GLB 면적 반영
                loaded: true
            };
        };

        // 병렬로 스펙 업데이트
        const newConifer = await updateModelSpec(coniferItem, treeModels.conifer);
        const newDeciduous = await updateModelSpec(deciduousItem, treeModels.deciduous);

        if (isMounted) {
            setTreeModels({
                conifer: newConifer,
                deciduous: newDeciduous
            });
        }

      } catch (e) {
        console.error("❌ 나무 모델 로드 실패:", e);
      }
    };

    loadModels();
    return () => { isMounted = false; };
  }, []); // 의존성 배열 비움 (최초 1회 실행)

  // 3. 면적 계산
  const polygonArea = useMemo(() => {
    if (drawingPoints.length < 3) return 0;
    const coords = drawingPoints.map(p => {
      const carto = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(carto.longitude), CesiumMath.toDegrees(carto.latitude)];
    });
    if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1])) {
        coords.push(coords[0]);
    }
    return Math.round(turf.area(turf.polygon([coords])));
  }, [drawingPoints]);

  // 4. 최대 식재 가능 수량 계산 (실제 면적 반영)
  const maxCapacity = useMemo(() => {
    if (polygonArea <= 0) return 0;
    
    const buffer = 0.5; // 나무 간 여유 공간 (m)
    
    // [변경] 단순 너비 제곱이 아니라 분석된 area(가로*세로)를 사용
    // 모델 면적 + 여유공간(버퍼) 고려: (루트(면적) + buffer)^2 형태로 근사하거나
    // 간단하게 area + (perimeter * buffer) 처럼 할 수 있지만,
    // 여기서는 (width + buffer) * (depth + buffer) 방식으로 계산
    
    // conifer.area는 이미 width * depth 값임.
    // 정사각형이라 가정하고 한변 길이 유추: Math.sqrt(area)
    const coniferSide = Math.sqrt(treeModels.conifer.area);
    const deciduousSide = Math.sqrt(treeModels.deciduous.area);

    const coniferUnitArea = (coniferSide + buffer) * (coniferSide + buffer);
    const deciduousUnitArea = (deciduousSide + buffer) * (deciduousSide + buffer);
    
    const avgUnitArea = (coniferUnitArea * settings.coniferRatio) + 
                        (deciduousUnitArea * (1 - settings.coniferRatio));
    
    // 식재 효율 (Packing Factor): 75%
    const packingFactor = 0.75;
    
    return Math.floor((polygonArea * packingFactor) / avgUnitArea);
  }, [polygonArea, settings.coniferRatio, treeModels]);

  // ... (나머지 estimatedCarbon, generateTrees 등은 기존 코드 유지) ...
  // 기존 코드 그대로 복사해서 하단부 채워주세요. (estimatedCarbon, generateTrees, reset, return)
  
  // 5. 예상 탄소 흡수량
  const estimatedCarbon = useMemo(() => {
    const currentCount = Math.floor(maxCapacity * settings.density);
    const coniferCount = Math.floor(currentCount * settings.coniferRatio);
    const deciduousCount = currentCount - coniferCount;
    return (coniferCount * 12.0) + (deciduousCount * 8.0);
  }, [maxCapacity, settings.density, settings.coniferRatio]);

  const generateTrees = useCallback(() => {
    if (drawingPoints.length < 3) return;
    const coords = drawingPoints.map(p => {
      const carto = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(carto.longitude), CesiumMath.toDegrees(carto.latitude)];
    });
    if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0])) coords.push(coords[0]);

    const turfPoly = turf.polygon([coords]);
    const bbox = turf.bbox(turfPoly);
    const targetCount = Math.floor(maxCapacity * settings.density);
    const coniferTarget = Math.floor(targetCount * settings.coniferRatio);
    
    const newTrees: TreeItem[] = [];
    let attempts = 0;
    const maxAttempts = targetCount * 30;

    while (newTrees.length < targetCount && attempts < maxAttempts) {
      attempts++;
      const batch = turf.randomPoint(Math.min(50, targetCount - newTrees.length + 10), { bbox: bbox });
      for (const feature of batch.features) {
        if (turf.booleanPointInPolygon(feature, turfPoly)) {
          const [lon, lat] = feature.geometry.coordinates;
          const isConifer = newTrees.length < coniferTarget;
          const modelData = isConifer ? treeModels.conifer : treeModels.deciduous;

          newTrees.push({
            position: Cartesian3.fromDegrees(lon, lat),
            type: isConifer ? 'CONIFER' : 'DECIDUOUS',
            modelUrl: modelData.url || '',
            scale: 1.0 
          });
          if (newTrees.length >= targetCount) break;
        }
      }
    }
    setTrees(newTrees);
    setIsDrawing(false);
  }, [drawingPoints, maxCapacity, settings, treeModels]);

  const reset = useCallback(() => {
    setTrees([]);
    setDrawingPoints([]);
    setIsDrawing(false);
  }, []);

  return { isDrawing, setIsDrawing, drawingPoints, setDrawingPoints, trees, generateTrees, settings, setSettings, estimatedCarbon, reset, polygonArea, maxCapacity, treeModels };
};