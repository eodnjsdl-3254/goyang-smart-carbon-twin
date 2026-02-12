import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCesium } from 'resium';
import { 
  Cartesian3, Transforms, HeadingPitchRoll, Math as CesiumMath,
  Model, Color, HeightReference, Scene, ColorBlendMode, Matrix4,
  LabelCollection, VerticalOrigin, Cartesian2, DistanceDisplayCondition,
  Entity, ColorMaterialProperty,
  Cartographic, CallbackProperty
} from 'cesium';
import { useBldgContext } from '../../context/BldgContext';
import type { BuildingProps } from '../../types';

const LAY_CONFIG = {
  LABEL_DIST: 8000, 
  COLORS: {
    SELECT: Color.fromCssColorString('#E0B0FF').withAlpha(0.9), 
    GHOST: Color.YELLOW.withAlpha(0.6), 
    DEFAULT: Color.WHITE,
    OUTLINE: Color.BLACK 
  }
};

// GLB/GLTF 파일의 바이너리 데이터를 파싱하여 크기(Dimensions)를 추출하는 함수
const parseGlbRaw = async (url: string) => {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const dataView = new DataView(buffer);
    
    // Magic Number 체크 ('glTF')
    if (dataView.getUint32(0, true) !== 0x46546c67) return null; 
    
    const chunkLength = dataView.getUint32(12, true);
    const chunkType = dataView.getUint32(16, true);
    
    // JSON Chunk 체크 ('JSON')
    if (chunkType !== 0x4E4F534A) return null; 
    
    const jsonChunk = new Uint8Array(buffer, 20, chunkLength);
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(jsonChunk);
    const gltf = JSON.parse(jsonString);
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let found = false;
    
    if (gltf.accessors) {
      gltf.accessors.forEach((acc: any) => {
         if (acc.min && acc.max && acc.min.length === 3 && acc.max.length === 3) {
            if (Number.isFinite(acc.min[0]) && Number.isFinite(acc.max[0])) {
               found = true;
               minX = Math.min(minX, acc.min[0]);
               minY = Math.min(minY, acc.min[1]);
               minZ = Math.min(minZ, acc.min[2]);
               maxX = Math.max(maxX, acc.max[0]);
               maxY = Math.max(maxY, acc.max[1]);
               maxZ = Math.max(maxZ, acc.max[2]);
            }
         }
      });
    }
    
    if (!found) return null;
    
    // x, y, z 크기를 구한 뒤 오름차순 정렬하여 width, depth, height 매핑
    const dims = [Math.abs(maxX - minX), Math.abs(maxY - minY), Math.abs(maxZ - minZ)].sort((a, b) => a - b);
    
    return {
      width: parseFloat(dims[2].toFixed(2)),
      depth: parseFloat(dims[1].toFixed(2)),
      height: parseFloat(dims[0].toFixed(2))
    };
  } catch (e) { return null; }
};

interface BuildingPrimitiveProps {
  building: BuildingProps;
  scene: Scene;
  isSelected: boolean;
  isGhost: boolean;
  onSizeDetected?: (updates: Partial<BuildingProps>) => void;
  viewer: any; 
}

const BuildingPrimitive: React.FC<BuildingPrimitiveProps> = ({ 
  building, scene, isSelected, isGhost, onSizeDetected, viewer 
}) => {
  const primitiveRef = useRef<Model | null>(null);
  const entityRef = useRef<Entity | null>(null);
  const labelRef = useRef<LabelCollection | null>(null);
  
  // [핵심] Ref에 최신 상태 저장 (렌더링 루프에서 사용)
  const buildingRef = useRef(building);
  const isSelectedRef = useRef(isSelected);
  const isGhostRef = useRef(isGhost);
  
  useEffect(() => {
    buildingRef.current = building;
    isSelectedRef.current = isSelected;
    isGhostRef.current = isGhost;
  }, [building, isSelected, isGhost]);

  const [detectedHeight, setDetectedHeight] = useState<number>(building.height || 0);
  const [terrainHeight, setTerrainHeight] = useState<number>(0);

  // 1. [지형 높이 계산 수정] ⚡️ 핵심 수정 사항 ⚡️
  // OSM 건물 지붕 위로 올라가는 현상을 막기 위해 sampleHeightMostDetailed 제거
  // 순수 지형(Terrain) 높이인 globe.getHeight만 사용합니다.
  useEffect(() => {
    if (!building.isModel) return;
    
    const updateHeight = () => {
        if (!scene.globe) return;
        const carto = Cartographic.fromDegrees(building.lon, building.lat);
        // [수정] 무조건 지형 높이만 가져옵니다.
        const globeH = scene.globe.getHeight(carto) || 0;
        setTerrainHeight(globeH);
    };

    // 초기 실행
    updateHeight();

    // 렌더링 루프마다 높이 보정 (카메라 줌인/아웃 시 지형 LOD 변경 대응)
    const removeListener = scene.postRender.addEventListener(updateHeight);
    return () => { removeListener(); };
  }, [building.lon, building.lat, building.isModel, scene]);


  // 2. [라벨 업데이트]
  const updateLabel = useCallback(() => {
    if (!viewer || !labelRef.current || labelRef.current.isDestroyed() || scene.isDestroyed()) return;
    const labels = labelRef.current;
    labels.removeAll();
    
    if (isGhostRef.current) return; 

    const b = buildingRef.current;
    
    let currentHeight = 0;
    if (b.isModel) {
        const scale = b.scaleZ ?? 1.0;
        const orgH = (b.originalHeight && b.originalHeight > 0.1) ? b.originalHeight : (detectedHeight || 10);
        currentHeight = orgH * scale;
    } else {
        currentHeight = b.height || 10;
    }

    const displayH = Math.max(currentHeight, 1.0);
    
    // [수정] 라벨 높이 계산 시에도 terrainHeight를 일관되게 사용
    const labelAltitude = terrainHeight + (b.altitude || 0) + displayH + 2.0;

    try {
      labels.add({
        position: Cartesian3.fromDegrees(b.lon, b.lat, labelAltitude),
        text: `H:${displayH.toFixed(1)}m`,
        font: 'bold 14px sans-serif', 
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: 2, 
        verticalOrigin: VerticalOrigin.BOTTOM, 
        pixelOffset: Cartesian2.ZERO, 
        distanceDisplayCondition: new DistanceDisplayCondition(0, LAY_CONFIG.LABEL_DIST),
        heightReference: HeightReference.NONE, 
        disableDepthTestDistance: Number.POSITIVE_INFINITY, 
      });
    } catch (e) {}
  }, [detectedHeight, terrainHeight, scene, viewer]);


  // 3. [모델(Primitive) 업데이트 루프]
  const updateModelPrimitive = useCallback(() => {
      if (scene.isDestroyed()) return;
      const b = buildingRef.current;
      if (!b.isModel) return;

      const currentIsGhost = isGhostRef.current;
      const currentIsSelected = isSelectedRef.current;

      let targetColor = Color.WHITE;
      let blendMode = ColorBlendMode.HIGHLIGHT;
      let blendAmount = 0.0;
      
      if (currentIsGhost) {
          targetColor = LAY_CONFIG.COLORS.GHOST;
          blendMode = ColorBlendMode.MIX;
          blendAmount = 0.7;
      } else if (currentIsSelected) {
          targetColor = LAY_CONFIG.COLORS.SELECT;
          blendMode = ColorBlendMode.MIX;
          blendAmount = 0.5;
      }

      if (primitiveRef.current && !primitiveRef.current.isDestroyed()) {
          // [수정] 모델 높이도 terrainHeight 사용으로 통일
          const alt = (b.altitude || 0) + terrainHeight;
          const pos = Cartesian3.fromDegrees(b.lon, b.lat, alt);
          const hpr = new HeadingPitchRoll(CesiumMath.toRadians(b.rotation || 0), 0, 0);
          const frame = Transforms.headingPitchRollToFixedFrame(pos, hpr);
          const s = { x: b.scaleX ?? 1, y: b.scaleY ?? 1, z: b.scaleZ ?? 1 };
          
          const matrix = Matrix4.multiply(frame, Matrix4.fromScale(new Cartesian3(s.x, s.y, s.z)), new Matrix4());
          primitiveRef.current.modelMatrix = matrix;
          primitiveRef.current.color = targetColor;
          primitiveRef.current.colorBlendMode = blendMode;
          primitiveRef.current.colorBlendAmount = blendAmount;
      }
      updateLabel();
  }, [terrainHeight, scene, updateLabel]);


  // 4. [렌더링 루프 등록] - 모델용
  useEffect(() => {
    if (building.isModel) {
        updateModelPrimitive(); 
        const removeListener = scene.postRender.addEventListener(updateModelPrimitive);
        return () => { removeListener(); };
    }
  }, [updateModelPrimitive, scene, building.isModel]);


  // 5. [객체 생성 및 리소스 로드]
  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    
    const cleanup = () => {
      if (primitiveRef.current && !primitiveRef.current.isDestroyed()) scene.primitives.remove(primitiveRef.current);
      if (entityRef.current) viewer.entities.remove(entityRef.current);
      if (labelRef.current && !labelRef.current.isDestroyed()) scene.primitives.remove(labelRef.current);
      primitiveRef.current = null;
      entityRef.current = null;
    };

    const load = async () => {
      cleanup();
      const labels = new LabelCollection({ scene });
      labelRef.current = labels;
      scene.primitives.add(labels);

      // [CASE 1] 3D Model
      if (building.isModel && building.modelUrl) {
        if (!isGhost && onSizeDetected) {
            parseGlbRaw(building.modelUrl).then(size => {
                if (cancelled || !size) return;
                setDetectedHeight(size.height);
                onSizeDetected({ ...size, originalWidth: size.width, originalDepth: size.depth, originalHeight: size.height });
            });
        }
        try {
          const model = await Model.fromGltfAsync({ 
            url: building.modelUrl, 
            modelMatrix: Matrix4.IDENTITY, 
            scene,
          });
          if (cancelled) { model.destroy(); return; }
          model.id = building.id; 
          
          primitiveRef.current = model;
          scene.primitives.add(model);
          
          model.readyEvent.addEventListener(() => {
              if(!cancelled && !detectedHeight && model.boundingSphere) {
                  setDetectedHeight(model.boundingSphere.radius * 0.7);
              }
          });
        } catch (e) { console.error("❌ [라이브러리 로드 실패]", e); }
      } 
      
      // [CASE 2] Box (Entity)
      else if (!building.isModel) {
        const positionProp = new CallbackProperty(() => {
            const b = buildingRef.current;
            const h = b.height || 10;
            const altitude = b.altitude || 0;
            const carto = Cartographic.fromDegrees(b.lon, b.lat);
            
            // 박스도 globe.getHeight만 사용하도록 통일
            const terrainH = scene.globe.getHeight(carto) || 0;
            
            const finalHeight = terrainH + altitude + (h / 2);
            return Cartesian3.fromDegrees(b.lon, b.lat, finalHeight);
        }, false);

        const orientationProp = new CallbackProperty(() => {
            const b = buildingRef.current;
            const pos = positionProp.getValue(undefined); 
            if (!pos) return undefined;
            const heading = CesiumMath.toRadians(b.rotation || 0);
            const hpr = new HeadingPitchRoll(heading, 0, 0);
            return Transforms.headingPitchRollQuaternion(pos, hpr);
        }, false);

        const dimProp = new CallbackProperty(() => {
            const b = buildingRef.current;
            return new Cartesian3(b.width, b.depth, b.height || 10);
        }, false);

        const materialProp = new ColorMaterialProperty(new CallbackProperty(() => {
            if (isGhostRef.current) return LAY_CONFIG.COLORS.GHOST;
            if (isSelectedRef.current) return LAY_CONFIG.COLORS.SELECT; 
            return LAY_CONFIG.COLORS.DEFAULT; 
        }, false));

        const entity = viewer.entities.add({
            id: building.id,
            position: positionProp,    
            orientation: orientationProp, 
            box: {
                dimensions: dimProp,
                heightReference: HeightReference.NONE, 
                material: materialProp, 
                outline: true,
                outlineColor: LAY_CONFIG.COLORS.OUTLINE,
                shadows: 0, 
            }
        });
        entityRef.current = entity;
        setDetectedHeight(building.height || 10);
        
        // Entity인 경우 라벨 업데이트 리스너 등록
        const removeLabelListener = scene.postRender.addEventListener(updateLabel);
        return () => removeLabelListener();
      }
    };
    
    load();
    return () => { cancelled = true; cleanup(); };
    
  }, [building.id, building.modelUrl, building.isModel, viewer, scene]); 

  return null;
};

export const BldgLayer: React.FC = () => {
  const { viewer } = useCesium();
  
  // Context에서 상태 가져오기
  const { 
    buildings, 
    selectedId, 
    cursorPos, 
    ghostBuilding, 
    updateBuilding 
  } = useBldgContext(); 

  if (!viewer) return null;

  return (
    <>
      {/* 실제 배치된 건물들 */}
      {buildings.map((b) => (
        <BuildingPrimitive 
          key={b.id} 
          building={b} 
          scene={viewer.scene} 
          isSelected={b.id === selectedId} 
          isGhost={false} 
          onSizeDetected={(updates) => updateBuilding?.(b.id, updates)} 
          viewer={viewer} 
        />
      ))}

      {/* 마우스 따라다니는 고스트(배치 전) 건물 */}
      {cursorPos && ghostBuilding && (
        <BuildingPrimitive 
          key="ghost-fixed-key"
          building={{ ...ghostBuilding, ...cursorPos }} 
          scene={viewer.scene} 
          isSelected={false} 
          isGhost={true} 
          viewer={viewer}
        />
      )}
    </>
  );
};