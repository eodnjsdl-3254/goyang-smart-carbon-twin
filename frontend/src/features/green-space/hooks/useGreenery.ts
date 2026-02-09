import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Cartesian3, Cartographic, Math as CesiumMath, 
  Transforms, HeadingPitchRoll 
} from 'cesium';
import * as turf from '@turf/turf';
import { useCesium } from 'resium'; 
import { fetchGreeneryLibrary } from '../api/greeneryApi'; 
import type { TreeItem, TreeConfig, GreeneryModel, TreeSpec } from '../types'; 
import { getGlbDimensions } from '../utils/glbUtils'; 

export const useGreenery = () => {
  const { viewer } = useCesium();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Cartesian3[]>([]);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [settings, setSettings] = useState({ coniferRatio: 0.5, density: 0.8 });
  
  const [treeModels, setTreeModels] = useState<TreeConfig>({
    conifer: { mlid: 143, url: null, width: 3.0, depth: 3.0, area: 9.0, loaded: false },
    deciduous: { mlid: 148, url: null, width: 5.0, depth: 5.0, area: 25.0, loaded: false }
  });

  const cId = treeModels.conifer.mlid;
  const dId = treeModels.deciduous.mlid;

  useEffect(() => {
    if (!viewer) return;
    const loadModels = async () => {
      try {
        const items: GreeneryModel[] = await fetchGreeneryLibrary();
        const cData = items.find(i => Number(i.id) === cId);
        const dData = items.find(i => Number(i.id) === dId);

        const analyze = async (model: GreeneryModel | undefined, current: TreeSpec): Promise<TreeSpec> => {
          if (!model?.modelUrl) return current;
          const url = model.modelUrl.replace(/\/public\/public\//g, '/public/').replace(/\/files\/public\//g, '/files/');
          try {
            const dims = await getGlbDimensions(url, viewer);
            const w = dims?.width || current.width;
            const d = dims?.depth || current.depth;
            return { ...current, url, width: w, depth: d, area: w * d, loaded: true };
          } catch {
            return { ...current, url, loaded: true };
          }
        };

        const [newC, newD] = await Promise.all([analyze(cData, treeModels.conifer), analyze(dData, treeModels.deciduous)]);
        setTreeModels({ conifer: newC, deciduous: newD });
      } catch (e) { console.error("🌲 모델 로드 실패:", e); }
    };
    loadModels();
  }, [viewer, cId, dId]);

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

  const generateTrees = useCallback(() => {
    if (drawingPoints.length < 3 || !viewer) return;

    const coords = drawingPoints.map(p => {
      const c = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude)];
    });
    coords.push(coords[0]);
    const poly = turf.polygon([coords]);
    const bbox = turf.bbox(poly);

    const avgWidth = (treeModels.conifer.width + treeModels.deciduous.width) / 2;
    const spacing = Math.max(1.5, avgWidth / Math.max(0.1, settings.density * 1.2)); 
    const grid = turf.pointGrid(bbox, spacing / 1000, { units: 'kilometers' });
    
    // 💡 ID 일치 필수: GreeneryLayer의 Polygon ID와 같아야 함
    const polyEntity = viewer.entities.getById('greenery-poly');
    const exclude = polyEntity ? [polyEntity] : [];

    const pointsInside = grid.features.filter(f => turf.booleanPointInPolygon(f, poly));
    
    const newTrees: TreeItem[] = pointsInside.slice(0, 3000).map((f, i): TreeItem => {
        const isConifer = Math.random() < settings.coniferRatio; 
        const model = isConifer ? treeModels.conifer : treeModels.deciduous;
        const [lon, lat] = f.geometry.coordinates;

        const jitter = (spacing * 0.3) / 111320;
        const fLon = lon + (Math.random() - 0.5) * jitter;
        const fLat = lat + (Math.random() - 0.5) * jitter;

        // ✅ 해결: sampleHeight는 Cartographic 타입을 인자로 받음
        const cartoPos = Cartographic.fromDegrees(fLon, fLat); 
        const height = viewer.scene.sampleHeight(cartoPos, exclude); 
        
        // 최종 배치는 Cartesian3로 변환
        const finalPos = Cartesian3.fromDegrees(fLon, fLat, height || 0);
        
        const hpr = new HeadingPitchRoll(Math.random() * CesiumMath.TWO_PI, 0, 0);
        return {
          id: `tree-${i}-${Date.now()}`,
          position: finalPos,
          type: isConifer ? 'CONIFER' : 'DECIDUOUS',
          modelUrl: model.url || "",
          scale: 0.8 + Math.random() * 0.5,
          orientation: Transforms.headingPitchRollQuaternion(finalPos, hpr)
        };
      }).filter(t => t.modelUrl !== "");

    setTrees(newTrees);
    setIsDrawing(false);
  }, [drawingPoints, settings, treeModels, viewer]);

  return { 
    isDrawing, setIsDrawing, drawingPoints, setDrawingPoints, 
    trees, generateTrees, settings, setSettings, 
    polygonArea, maxCapacity, treeModels, 
    estimatedCarbon: useMemo(() => (trees.length * 10.0), [trees]),
    reset: () => { setTrees([]); setDrawingPoints([]); setIsDrawing(false); } 
  };
};