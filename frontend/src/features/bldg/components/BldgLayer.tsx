import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCesium } from 'resium';
import { 
  Cartesian3, Transforms, HeadingPitchRoll, Math as CesiumMath,
  Model, Color, BoxGeometry, GeometryInstance, PerInstanceColorAppearance,
  Primitive, HeightReference, Scene, ColorBlendMode, ColorGeometryInstanceAttribute,
  Matrix4, LabelCollection, VerticalOrigin, Cartesian2, DistanceDisplayCondition,
  BoundingSphere
} from 'cesium';
import type { BuildingProps } from '../types';

const LAY_CONFIG = {
  LABEL_DIST: 8000, 
  COLORS: {
    SELECT: Color.fromCssColorString('#E0B0FF').withAlpha(0.9),
    GHOST: Color.YELLOW.withAlpha(0.6),
  }
};

/**
 * 📦 GLB 파일을 직접 다운로드하여 바이너리를 파싱하는 함수
 * (User Provided Logic Adapted for Fetch)
 */
const parseGlbRaw = async (url: string) => {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const dataView = new DataView(buffer);

    // 1. 매직 넘버 체크 ('glTF')
    if (dataView.getUint32(0, true) !== 0x46546c67) {
      console.warn("❌ Not a valid GLB file");
      return null;
    }

    // 2. JSON 청크 추출
    // Header(12) = Magic(4) + Version(4) + Length(4)
    // Chunk0 Header(8) = Length(4) + Type(4)
    const chunkLength = dataView.getUint32(12, true);
    const chunkType = dataView.getUint32(16, true);

    if (chunkType !== 0x4E4F534A) { // 'JSON'
       console.warn("❌ JSON chunk not found");
       return null;
    }

    const jsonChunk = new Uint8Array(buffer, 20, chunkLength);
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(jsonChunk);
    const gltf = JSON.parse(jsonString);

    // 3. 물리적 크기 정밀 계산 (Accessors 전수 조사)
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let found = false;

    if (gltf.accessors) {
      gltf.accessors.forEach((acc: any) => {
         // min/max가 있고 좌표(x,y,z) 형태인 경우만
         if (acc.min && acc.max && acc.min.length === 3 && acc.max.length === 3) {
            // 텍스처 좌표나 노멀 등은 제외하고, 실제 형상(Position)일 가능성이 높은 것만 추림
            // (보통 형상 좌표는 값이 큼. 하지만 여기선 안전하게 전체 범위를 잡음)
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

    const rawW = Math.abs(maxX - minX);
    const rawH = Math.abs(maxY - minY);
    const rawD = Math.abs(maxZ - minZ);

    // 🔄 [축 정렬] 건물 특성상 가장 짧은 변을 높이로 간주
    // (GLB 마다 Y-up, Z-up이 달라도 납작한 건물을 제대로 표현하기 위함)
    const dims = [rawW, rawH, rawD].sort((a, b) => a - b);

    return {
      width: parseFloat(dims[2].toFixed(2)),  // 긴 변 1
      depth: parseFloat(dims[1].toFixed(2)),  // 긴 변 2
      height: parseFloat(dims[0].toFixed(2))  // 짧은 변 (높이)
    };

  } catch (e) {
    console.error("❌ GLB Raw Parse Error:", e);
    return null;
  }
};


interface BuildingPrimitiveProps {
  building: BuildingProps;
  scene: Scene;
  isSelected: boolean;
  isGhost: boolean;
  onSizeDetected?: (updates: Partial<BuildingProps>) => void;
}

const BuildingPrimitive: React.FC<BuildingPrimitiveProps> = ({ 
  building, scene, isSelected, isGhost, onSizeDetected 
}) => {
  const primitiveRef = useRef<any>(null);
  const labelRef = useRef<LabelCollection | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const [detectedHeight, setDetectedHeight] = useState<number>(building.height || 0);

  // 🎨 색상 제어
  useEffect(() => {
    const model = primitiveRef.current;
    if (model && !model.isDestroyed() && isReady && building.isModel) {
      model.color = isGhost ? LAY_CONFIG.COLORS.GHOST : (isSelected ? LAY_CONFIG.COLORS.SELECT : Color.WHITE);
      model.colorBlendAmount = isGhost ? 0.8 : (isSelected ? 0.5 : 0.0);
      model.colorBlendMode = ColorBlendMode.MIX;
    }
  }, [isSelected, isGhost, isReady, building.isModel]);

  const computeModelMatrix = useCallback(() => {
    const pos = Cartesian3.fromDegrees(building.lon, building.lat, building.altitude || 0);
    const hpr = new HeadingPitchRoll(CesiumMath.toRadians(building.rotation || 0), 0, 0);
    const frame = Transforms.headingPitchRollToFixedFrame(pos, hpr);
    
    if (building.isModel) {
      const s = { 
        x: building.scaleX ?? 1.0, 
        y: building.scaleY ?? 1.0, 
        z: building.scaleZ ?? 1.0 
      };
      return Matrix4.multiply(frame, Matrix4.fromScale(new Cartesian3(s.x, s.y, s.z)), new Matrix4());
    }
    return frame;
  }, [building]);

  // 🏷️ 라벨 업데이트
  const updateLabel = useCallback(() => {
    if (!labelRef.current || labelRef.current.isDestroyed() || scene.isDestroyed()) return;
    const labels = labelRef.current;
    labels.removeAll();
    
    const rawHeight = detectedHeight > 0.1 ? detectedHeight : (building.height || 5.0);
    const displayH = rawHeight * (building.scaleZ ?? 1.0);
    const hRef = isGhost ? HeightReference.NONE : HeightReference.RELATIVE_TO_GROUND;
    const labelAltitude = hRef === HeightReference.NONE 
      ? (building.altitude || 0) + displayH + 0.3 
      : displayH + 0.3;

    try {
      labels.add({
        position: Cartesian3.fromDegrees(building.lon, building.lat, labelAltitude),
        text: `H:${displayH.toFixed(1)}m`,
        font: 'bold 14px sans-serif', 
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: 2, 
        verticalOrigin: VerticalOrigin.BOTTOM, 
        pixelOffset: Cartesian2.ZERO, 
        distanceDisplayCondition: new DistanceDisplayCondition(0, LAY_CONFIG.LABEL_DIST),
        heightReference: hRef,
        disableDepthTestDistance: Number.POSITIVE_INFINITY 
      });
    } catch (e) { console.error(e); }
  }, [building, isGhost, scene, detectedHeight]);

  useEffect(() => { updateLabel(); }, [detectedHeight, updateLabel]);

  useEffect(() => {
    let cancelled = false;
    const cleanup = () => {
      if (primitiveRef.current && !primitiveRef.current.isDestroyed()) scene.primitives.remove(primitiveRef.current);
      if (labelRef.current && !labelRef.current.isDestroyed()) scene.primitives.remove(labelRef.current);
    };

    const load = async () => {
      cleanup();
      if (scene.isDestroyed()) return;
      
      const labels = new LabelCollection({ scene });
      labelRef.current = labels;
      scene.primitives.add(labels);
      updateLabel(); 

      if (building.isModel && building.modelUrl) {
        // 🔥 [핵심] Cesium 로드와 별개로, 원본 파일을 직접 가져와서 크기 분석 (병렬 실행)
        // 이렇게 하면 Cesium 내부 상태와 무관하게 정확한 데이터를 얻을 수 있음.
        if (!isGhost && onSizeDetected) {
            parseGlbRaw(building.modelUrl).then(size => {
                if (cancelled || !size) return;
                console.log(`📏 [Raw Parse] Success: ${size.width}x${size.depth}x${size.height}`);
                
                // 감지된 높이 업데이트
                setDetectedHeight(size.height);
                
                // 상위 컴포넌트로 데이터 전송
                onSizeDetected({ 
                  width: size.width,
                  depth: size.depth,
                  height: size.height,
                  originalWidth: size.width,
                  originalDepth: size.depth,
                  originalHeight: size.height
                });
            });
        }

        try {
          const model = await Model.fromGltfAsync({ 
            url: building.modelUrl, 
            modelMatrix: computeModelMatrix(), 
            scene,
            heightReference: HeightReference.NONE
          });
          
          if (cancelled) { model.destroy(); return; }
          model.id = building.id;
          primitiveRef.current = model;
          scene.primitives.add(model);

          model.readyEvent.addEventListener((m: Model) => {
            if (cancelled || scene.isDestroyed() || m.isDestroyed()) return;
            if (!isGhost) m.heightReference = HeightReference.RELATIVE_TO_GROUND;

            // 이미 Raw Parse에서 정확한 값을 찾았을 테니, 여기서는 화면 렌더링 준비 완료만 처리
            // 혹시 Raw Parse가 실패했을 경우를 대비해 Fallback을 유지할 수도 있지만,
            // 지금은 Raw Parse가 훨씬 강력하므로 그쪽 데이터를 신뢰.
            if (!detectedHeight) {
                const radius = m.boundingSphere?.radius || 5.0;
                setDetectedHeight(radius * 0.7); // Fallback 시각용
            }
            setIsReady(true);
            updateLabel();
          });
        } catch (e) { console.error("GLB Load Error:", e); }
      } else if (!building.isModel) {
        // 박스형
        const instance = new GeometryInstance({
          id: building.id,
          geometry: BoxGeometry.fromDimensions({
            dimensions: new Cartesian3(building.width || 20, building.depth || 20, building.height || 11),
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT
          }),
          modelMatrix: computeModelMatrix(),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(isGhost ? LAY_CONFIG.COLORS.GHOST : (isSelected ? LAY_CONFIG.COLORS.SELECT : Color.WHITE))
          }
        });
        const boxPrimitive = new Primitive({
          geometryInstances: instance,
          appearance: new PerInstanceColorAppearance({ flat: true, translucent: isGhost }),
          asynchronous: false
        });
        primitiveRef.current = boxPrimitive;
        scene.primitives.add(boxPrimitive);
        setDetectedHeight(building.height || 11);
        setIsReady(true);
        updateLabel();
      }
    };
    
    load();
    return () => { cancelled = true; cleanup(); };
  }, [building.id, building.modelUrl, isGhost, scene]); 

  useEffect(() => {
    if (primitiveRef.current && !primitiveRef.current.isDestroyed() && isReady) {
      if (building.isModel) primitiveRef.current.modelMatrix = computeModelMatrix();
      updateLabel();
    }
  }, [computeModelMatrix, isSelected, isReady, updateLabel, building]);

  return null;
};

export const BldgLayer: React.FC<{
  buildings: BuildingProps[];
  selectedId: string | null;
  cursorPos: { lat: number; lon: number } | null;
  ghostBuilding: BuildingProps | null;
  onUpdateBuilding?: (id: string, updates: Partial<BuildingProps>) => void;
}> = ({ buildings = [], selectedId, cursorPos, ghostBuilding, onUpdateBuilding }) => {
  const { viewer } = useCesium();
  if (!viewer) return null;

  return (
    <>
      {buildings.map((b) => (
        <BuildingPrimitive 
          key={b.id} 
          building={b} 
          scene={viewer.scene} 
          isSelected={b.id === selectedId} 
          isGhost={false} 
          onSizeDetected={(u) => onUpdateBuilding?.(b.id, u)} 
        />
      ))}
      {cursorPos && ghostBuilding && (
        <BuildingPrimitive 
          key="ghost-item" 
          building={{ ...ghostBuilding, ...cursorPos }} 
          scene={viewer.scene} 
          isSelected={false} 
          isGhost={true} 
        />
      )}
    </>
  );
};