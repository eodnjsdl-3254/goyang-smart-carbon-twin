import { useState, useCallback, useMemo } from 'react';
import { Cartesian3, Cartographic, Math as CesiumMath } from 'cesium';
import * as turf from '@turf/turf';

export interface TreeItem {
  position: Cartesian3;
  type: 'CONIFER' | 'DECIDUOUS';
}

export const useGreenery = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Cartesian3[]>([]);
  const [trees, setTrees] = useState<TreeItem[]>([]);
  
  const [settings, setSettings] = useState({
    coniferRatio: 0.5,
    density: 0.5,
  });

  const estimatedCarbon = useMemo(() => {
    const totalCount = trees.length;
    const coniferCount = Math.floor(totalCount * settings.coniferRatio);
    const deciduousCount = totalCount - coniferCount;
    return (coniferCount * 12.0) + (deciduousCount * 8.0);
  }, [trees, settings]);

  const generateTrees = useCallback((points: Cartesian3[]) => {
    if (points.length < 3) return;

    const coords = points.map(p => {
      const carto = Cartographic.fromCartesian(p);
      return [CesiumMath.toDegrees(carto.longitude), CesiumMath.toDegrees(carto.latitude)];
    });
    coords.push(coords[0]);

    const polygon = turf.polygon([coords]);
    const bbox = turf.bbox(polygon);
    
    const spacing = 10 / (settings.density + 0.1); 
    const grid = turf.pointGrid(bbox, spacing / 1000, { units: 'kilometers' });
    
    const inside = grid.features.filter(f => turf.booleanPointInPolygon(f, polygon));
    
    // newTrees 변수에 TreeItem[] 타입을 명시적으로 지정합니다.
    // 이렇게 하면 'string'이 '"CONIFER" | "DECIDUOUS"'에 할당될 수 없다는 오류가 해결됩니다.
    const newTrees: TreeItem[] = inside.map((f, idx) => ({
      position: Cartesian3.fromDegrees(f.geometry.coordinates[0], f.geometry.coordinates[1]),
      type: idx < inside.length * settings.coniferRatio ? 'CONIFER' : 'DECIDUOUS'
    }));

    setTrees(newTrees);
    setIsDrawing(false);
  }, [settings]);

  const reset = useCallback(() => {
    setTrees([]);
    setDrawingPoints([]);
    setIsDrawing(false);
  }, []);

  return { 
    isDrawing, setIsDrawing, 
    drawingPoints, setDrawingPoints, 
    trees, generateTrees, 
    settings, setSettings,
    estimatedCarbon, reset 
  };
};