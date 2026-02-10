import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCesium } from 'resium';
import { 
  Cartesian3, Transforms, HeadingPitchRoll, Math as CesiumMath,
  Model, Color, HeightReference, Scene, ColorBlendMode, Matrix4,
  LabelCollection, VerticalOrigin, Cartesian2, DistanceDisplayCondition,
  Entity, ColorMaterialProperty,
  Cartographic, CallbackProperty
} from 'cesium';
import { useBldgContext } from '../context/BldgContext';
import type { BuildingProps } from '../types';

const LAY_CONFIG = {
  LABEL_DIST: 8000, 
  COLORS: {
    SELECT: Color.fromCssColorString('#E0B0FF').withAlpha(0.9), 
    GHOST: Color.YELLOW.withAlpha(0.6), 
    DEFAULT: Color.WHITE,
    OUTLINE: Color.BLACK 
  }
};

const parseGlbRaw = async (url: string) => {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const dataView = new DataView(buffer);
    if (dataView.getUint32(0, true) !== 0x46546c67) return null; 
    const chunkLength = dataView.getUint32(12, true);
    const chunkType = dataView.getUint32(16, true);
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

  // 1. [지형 높이 계산]
  useEffect(() => {
    if (!building.isModel) return;
    let isMounted = true; 

    const updateHeight = async () => {
        if (!scene.globe) return;
        const carto = Cartographic.fromDegrees(building.lon, building.lat);
        const globeH = scene.globe.getHeight(carto) || 0;
        
        if (isMounted) setTerrainHeight(globeH);
        
        if (!isGhost) {
             try {
                 const updated = await scene.sampleHeightMostDetailed([carto]);
                 if (isMounted && updated && updated[0]) {
                     setTerrainHeight(updated[0].height || globeH);
                 }
             } catch (e) { }
        }
    };
    updateHeight();
    return () => { isMounted = false; };
  }, [building.lon, building.lat, isGhost, building.isModel, scene]);


  // 2. [라벨 업데이트] - buildingRef 사용으로 의존성 제거
  const updateLabel = useCallback(() => {
    if (!viewer || !labelRef.current || labelRef.current.isDestroyed() || scene.isDestroyed()) return;
    const labels = labelRef.current;
    labels.removeAll();
    
    // Ghost 상태일 때는 라벨 표시 안 함 (선택 사항)
    if (isGhostRef.current) return; 

    const b = buildingRef.current; // [변경] Ref 사용
    
    let currentHeight = 0;
    if (b.isModel) {
        const scale = b.scaleZ ?? 1.0;
        const orgH = (b.originalHeight && b.originalHeight > 0.1) ? b.originalHeight : (detectedHeight || 10);
        currentHeight = orgH * scale;
    } else {
        currentHeight = b.height || 10;
    }

    const displayH = Math.max(currentHeight, 1.0);
    
    const carto = Cartographic.fromDegrees(b.lon, b.lat);
    const tHeight = scene.globe.getHeight(carto) || terrainHeight || 0;
    const labelAltitude = tHeight + (b.altitude || 0) + displayH + 1.0;

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
  }, [detectedHeight, terrainHeight, scene, viewer]); // building 제거


  // 3. [모델(Primitive) 업데이트 루프] - buildingRef 사용
  const updateModelPrimitive = useCallback(() => {
      if (scene.isDestroyed()) return;
      // Ref에서 최신 값 가져옴
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
  }, [terrainHeight, scene, updateLabel]); // building, isSelected, isGhost 제거


  // 4. [렌더링 루프 등록] - 모델용
  useEffect(() => {
    // 모델인 경우에만 루프 등록
    // building 자체가 바뀌어도 updateModelPrimitive는 안정적이므로 리스너가 끊기지 않음
    if (building.isModel) {
        updateModelPrimitive(); // 초기 1회 실행
        const removeListener = scene.postRender.addEventListener(updateModelPrimitive);
        return () => { removeListener(); };
    }
  }, [updateModelPrimitive, scene, building.isModel]);


  // 5. [객체 생성 및 CallbackProperty 적용]
  // 중요: 이 useEffect의 의존성 배열에서 'updateLabel' 등을 제거하거나 안정화시켜야 함.
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
        // 사이즈 감지는 로드 시 1회만 수행
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
          // 여기서 updateModelPrimitive를 한번 호출하지만, postRender 루프는 별도 useEffect에서 관리됨
          
          model.readyEvent.addEventListener(() => {
              if(!cancelled && !detectedHeight && model.boundingSphere) {
                  setDetectedHeight(model.boundingSphere.radius * 0.7);
              }
          });
        } catch (e) { console.error("❌ [라이브러리 로드 실패]", e); }
      } 
      
      // [CASE 2] Box (Entity)
      else if (!building.isModel) {
        // ... (기존 Entity 로직 유지 - CallbackProperty 사용하므로 안전함)
        const positionProp = new CallbackProperty(() => {
            const b = buildingRef.current;
            const h = b.height || 10;
            const altitude = b.altitude || 0;
            
            const carto = Cartographic.fromDegrees(b.lon, b.lat);
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
        
        // Entity인 경우 라벨 업데이트 리스너를 여기서 등록
        const removeLabelListener = scene.postRender.addEventListener(updateLabel);
        return () => removeLabelListener();
      }
    };
    
    load();
    return () => { cancelled = true; cleanup(); };
    
  // [중요 수정] building 전체가 아니라 식별자(id)와 모델 URL만 의존성으로 가짐
  // updateLabel은 useCallback으로 안정화되었지만, 안전을 위해 Entity일 때만 내부에서 연결하므로 제거 가능
  // 하지만 Entity case에서 updateLabel을 쓰므로, 아래 의존성에서 building.modelUrl과 building.id가 바뀌지 않는 한 재실행 안됨.
  }, [building.id, building.modelUrl, building.isModel, viewer, scene]); 
  // onSizeDetected도 의존성에서 뺌 (함수가 바뀌어도 로딩을 다시 할 필요는 없음)

  return null;
};

export const BldgLayer: React.FC = () => {
  const { viewer } = useCesium();
  
  // 1. Props 대신 Context에서 상태 가져오기
  const { 
    buildings, 
    selectedId, 
    cursorPos, 
    ghostBuilding, 
    updateBuilding // onUpdateBuilding 대신 updateBuilding (Context 네이밍에 맞춤)
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
          // Context의 update 함수 연결
          onSizeDetected={(updates) => updateBuilding?.(b.id, updates)} 
          viewer={viewer} 
        />
      ))}

      {/* 마우스 따라다니는 고스트(배치 전) 건물 */}
      {cursorPos && ghostBuilding && (
        <BuildingPrimitive 
          key="ghost-fixed-key"
          // ghostBuilding에 현재 커서 위치(lat, lon) 덮어씌우기
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