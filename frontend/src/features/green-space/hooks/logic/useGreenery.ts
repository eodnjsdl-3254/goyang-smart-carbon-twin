import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Cartesian3, Cartographic, Math as CesiumMath, 
  Transforms, HeadingPitchRoll 
} from 'cesium';
import * as turf from '@turf/turf';
import { fetchGreeneryLibrary } from '../../api/greeneryApi'; 
import type { TreeItem, TreeConfig, GreeneryModel } from '../../types';

export const useGreenery = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Cartesian3[]>([]);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [settings, setSettings] = useState({ coniferRatio: 0.5, density: 0.8 });
  
  const [treeModels, setTreeModels] = useState<TreeConfig>({
    conifer: { mlid: 144, url: null, width: 3.0, depth: 3.0, area: 9.0, loaded: false },
    deciduous: { mlid: 148, url: null, width: 6.0, depth: 6.0, area: 36.0, loaded: false }
  });

  // 모델 로드 로직
  useEffect(() => {
    const loadModels = async () => {
      try {
        const items: GreeneryModel[] = await fetchGreeneryLibrary();
        if (!items || items.length === 0) return;

        const findModel = (id: number) => items.find(i => Number(i.id) === id);
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

        setTreeModels(prev => ({
            conifer: { ...prev.conifer, mlid: Number(cData?.id), url: fixUrl(cData), loaded: true },
            deciduous: { ...prev.deciduous, mlid: Number(dData?.id), url: fixUrl(dData), loaded: true }
        }));
      } catch (e) { console.error("❌ 로드 에러:", e); }
    };
    loadModels();
  }, []); 

  // 면적 계산
  const polygonArea = useMemo(() => {
    if (drawingPoints.length < 3) return 0;
    const coords = drawingPoints.map(p => {
      const c = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude)];
    });
    coords.push(coords[0]);
    return turf.area(turf.polygon([coords]));
  }, [drawingPoints]);

  // 수용량 계산
  const maxCapacity = useMemo(() => {
    if (polygonArea <= 0) return 0;
    const avgArea = (treeModels.conifer.area * settings.coniferRatio) + 
                    (treeModels.deciduous.area * (1 - settings.coniferRatio));
    return Math.floor(polygonArea / (avgArea || 25));
  }, [polygonArea, treeModels, settings.coniferRatio]);

  // 나무 생성
  const generateTrees = useCallback(() => {
    if (drawingPoints.length < 3 || !treeModels.conifer.url) return;

    try {
        const coords = drawingPoints.map(p => {
          const c = Cartographic.fromCartesian(p);
          return [CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude)];
        });
        coords.push(coords[0]);
        const poly = turf.polygon([coords]);
        const bbox = turf.bbox(poly);

        const weightedAvgWidth = (treeModels.conifer.width * settings.coniferRatio) + 
                                 (treeModels.deciduous.width * (1 - settings.coniferRatio));
        const spacing = Math.max(1.5, weightedAvgWidth / Math.max(0.1, settings.density * 1.8)); 
        
        const grid = turf.pointGrid(bbox, spacing / 1000, { units: 'kilometers' });
        const pointsInside = grid.features.filter(f => turf.booleanPointInPolygon(f, poly));
        const limitedPoints = pointsInside.slice(0, 3000); 

        const newTrees = limitedPoints.map((f, i) => {
            const isConifer = Math.random() < settings.coniferRatio; 
            const model = isConifer ? treeModels.conifer : treeModels.deciduous;
            if (!model.url) return null;

            const [lon, lat] = f.geometry.coordinates;
            const finalPos = Cartesian3.fromDegrees(lon, lat, 0); 
            const hpr = new HeadingPitchRoll(Math.random() * CesiumMath.TWO_PI, 0, 0);
            
            return {
              id: `tree-${Date.now()}-${i}`,
              position: finalPos,
              type: isConifer ? 'CONIFER' : 'DECIDUOUS',
              modelUrl: model.url,
              scale: 1.0, 
              orientation: Transforms.headingPitchRollQuaternion(finalPos, hpr)
            } as TreeItem;
        }).filter((t): t is TreeItem => t !== null);

        setTrees(newTrees);
        setIsDrawing(false);

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
    polygonArea, maxCapacity, treeModels, reset
  };
};