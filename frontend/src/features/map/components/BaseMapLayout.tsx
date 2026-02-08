import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Viewer, ImageryLayer, useCesium, ScreenSpaceEventHandler, ScreenSpaceEvent } from 'resium';
import { 
  Cartesian3, OpenStreetMapImageryProvider, WebMapTileServiceImageryProvider, 
  WebMercatorTilingScheme, createWorldTerrainAsync, TerrainProvider, Ion,
  createOsmBuildingsAsync, Cesium3DTileset as Cesium3DTilesetClass, Cesium3DTileStyle,
  Cartographic, Matrix4, sampleTerrainMostDetailed, ScreenSpaceEventType, Math as CesiumMath, Color
} from 'cesium';

// 피처별 컴포넌트 및 컨텍스트 임포트
import { MapControlBar } from '@/features/map/components/MapControlBar'; 
import { useMapContext, MapProvider } from '@/features/map/context/MapContext';
import { BldgLayer } from '@/features/bldg/components/BldgLayer';
import { BldgSimPanel } from '@/features/bldg/components/BldgSimPanel';
import { BldgInfoCard } from '@/features/bldg/components/BldgInfoCard';
import { BldgProvider, useBldgContext } from '@/features/bldg/context/BldgContext';
import { GreeneryLayer } from '@/features/green-space/components/GreeneryLayer';
import { GreenerySimulationPanel } from '@/features/green-space/components/GreenerySimulationPanel';
import { GreeneryProvider, useGreeneryContext } from '@/features/green-space/context/GreeneryContext';

const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;
Ion.defaultAccessToken = CESIUM_TOKEN;

// ----------------------------------------------------------------------
// 🖱️ 맵 이벤트 핸들러 (클릭 및 마우스 이동)
// ----------------------------------------------------------------------
const MapEventHandler = () => {
  const { viewer } = useCesium();
  const { handleMapClick, handleMouseMove, selectBuildingObj, mode, setSelectedBuildingId } = useBldgContext();
  const greenery = useGreeneryContext();

  const onLeftClick = useCallback((movement: any) => {
    if (!viewer) return;

    // 1. 객체 선택 로직 (IDLE 모드일 때만 동작)
    if (mode === 'IDLE') {
      const pickedObject = viewer.scene.pick(movement.position);
      if (pickedObject) {
         const pickedId = pickedObject.id || pickedObject.primitive?.id;
         if (typeof pickedId === 'string' && !pickedId.includes('ghost')) {
            selectBuildingObj(pickedId); 
            return; 
         }
      }
      if (!greenery.isDrawing) setSelectedBuildingId(null);
    }

    // 2. 지형 좌표 추출 및 액션 수행
    const cartesian = viewer.scene.pickPosition(movement.position);
    if (cartesian) {
      const cartographic = Cartographic.fromCartesian(cartesian);
      const lat = CesiumMath.toDegrees(cartographic.latitude);
      const lon = CesiumMath.toDegrees(cartographic.longitude);
      const height = cartographic.height;

      if (greenery.isDrawing) {
         greenery.setDrawingPoints((prev: Cartesian3[]) => [...prev, Cartesian3.fromDegrees(lon, lat, height)]);
      } else if (mode !== 'VIEW' && mode !== 'IDLE') {
         handleMapClick({ lat, lon }); 
      }
    }
  }, [viewer, mode, handleMapClick, selectBuildingObj, setSelectedBuildingId, greenery]);

  const onMouseMove = useCallback((movement: any) => {
    if (!viewer) return;
    if (mode === 'LIBRARY' || mode === 'CREATE' || mode === 'RELOCATE') {
        const cartesian = viewer.scene.pickPosition(movement.endPosition);
        if (cartesian) {
            const cartographic = Cartographic.fromCartesian(cartesian);
            handleMouseMove({ 
              lat: CesiumMath.toDegrees(cartographic.latitude), 
              lon: CesiumMath.toDegrees(cartographic.longitude) 
            });
        }
    }
  }, [viewer, mode, handleMouseMove]);

  return (
    <ScreenSpaceEventHandler>
      <ScreenSpaceEvent type={ScreenSpaceEventType.LEFT_CLICK} action={onLeftClick} />
      <ScreenSpaceEvent type={ScreenSpaceEventType.MOUSE_MOVE} action={onMouseMove} />
    </ScreenSpaceEventHandler>
  );
};

// ----------------------------------------------------------------------
// 🎮 맵 컨트롤러 (카메라 제어)
// ----------------------------------------------------------------------
const MapController = () => {
  const { viewer } = useCesium();
  const { cameraTarget } = useMapContext();

  useEffect(() => {
    if (viewer && cameraTarget.ts > 0) {
      viewer.camera.flyTo({ 
        destination: Cartesian3.fromDegrees(cameraTarget.lon, cameraTarget.lat, cameraTarget.height), 
        duration: 2 
      });
    }
  }, [cameraTarget, viewer]);

  useEffect(() => { 
    if (viewer) viewer.scene.globe.depthTestAgainstTerrain = true; 
  }, [viewer]);

  return null;
};

// ----------------------------------------------------------------------
// 🏢 OSM 3D 건물 레이어 관리자 (지면 밀착 보정 추가)
// ----------------------------------------------------------------------
const OsmBuildingsManager: React.FC<{ terrainProvider: TerrainProvider }> = ({ terrainProvider }) => {
  const { viewer } = useCesium();
  const VISIBLE_HEIGHT_THRESHOLD = 3000; 

  useEffect(() => {
    if (!viewer || !terrainProvider) return;
    let osmTileset: Cesium3DTilesetClass | null = null;
    let isMounted = true; 
    let removeListener: (() => void) | undefined;

    const loadOsm = async () => {
      try {
        const primitives = viewer.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const p = primitives.get(i);
          if (p instanceof Cesium3DTilesetClass && (p as any)._url?.includes('osm')) return;
        }

        osmTileset = await createOsmBuildingsAsync({
          defaultColor: Color.WHITE,
          style: new Cesium3DTileStyle({
            color: { conditions: [["true", "color('white', 1.0)"]] }
          })
        });

        if (!isMounted || viewer.isDestroyed()) return; 
        viewer.scene.primitives.add(osmTileset);

        // ✅ OSM 건물 높이 보정 (지형에 밀착시키기)
        // 1. 타일셋의 중심점(BoundingSphere Center)을 구함
        const centerCartesian = osmTileset.boundingSphere.center;
        const centerCartographic = Cartographic.fromCartesian(centerCartesian);

        // 2. 해당 중심점의 지형 높이를 샘플링
        const [terrainSample] = await sampleTerrainMostDetailed(terrainProvider, [centerCartographic]);

        if (terrainSample && isMounted && osmTileset) {
          // 3. 지형 높이만큼 타일셋을 이동시키는 Translation 행렬 계산
          // (OSM 데이터가 지형 높이를 반영하지 않은 경우를 가정하여 보정)
          const surface = Cartesian3.fromRadians(centerCartographic.longitude, centerCartographic.latitude, 0.0);
          const offset = Cartesian3.fromRadians(centerCartographic.longitude, centerCartographic.latitude, terrainSample.height);
          const translation = Cartesian3.subtract(offset, surface, new Cartesian3());
          
          osmTileset.modelMatrix = Matrix4.fromTranslation(translation);
        }

        removeListener = viewer.scene.preRender.addEventListener(() => {
            if (!osmTileset || osmTileset.isDestroyed()) return;
            const cameraHeight = viewer.camera.positionCartographic.height;
            osmTileset.show = cameraHeight < VISIBLE_HEIGHT_THRESHOLD;
        });

      } catch (e) { console.error("❌ OSM 로드 실패:", e); }
    };

    loadOsm();
    return () => {
        isMounted = false;
        if (removeListener) removeListener(); 
        if (viewer && !viewer.isDestroyed() && osmTileset) viewer.scene.primitives.remove(osmTileset);
    };
  }, [viewer, terrainProvider]); 

  return null;
};

// ----------------------------------------------------------------------
// 🗺️ 메인 지도 컨테이너
// ----------------------------------------------------------------------
const MapContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { buildings, selectedBuilding, cursorPos, mode, selectedLibItem, inputs, updateBuilding } = useBldgContext();
  const greenery = useGreeneryContext(); 
  const { currentBaseMap, showVWorld3D, vworldKey } = useMapContext();
  const [terrainProvider, setTerrainProvider] = useState<TerrainProvider | undefined>(undefined);

  // 1. 지형 데이터 로드
  useEffect(() => {
    if (!CESIUM_TOKEN) return;
    createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: true })
      .then(setTerrainProvider)
      .catch(console.error);
  }, []);

  // 2. 타일 공급자 설정
  const osmProvider = useMemo(() => {
    return new OpenStreetMapImageryProvider({ url: "https://a.tile.openstreetmap.org/", maximumLevel: 19 });
  }, []);

  const vworldProvider = useMemo(() => {
    if (currentBaseMap === 'OSM') return null;
    const apiKey = vworldKey || "37B44C3A-8C01-30CE-806E-7D89E87B8473"; 
    const provider = new WebMapTileServiceImageryProvider({
      url: `http://api.vworld.kr/req/wmts/1.0.0/${apiKey}/${currentBaseMap === 'Hybrid' ? 'Hybrid' : 'Satellite'}/{TileMatrix}/{TileRow}/{TileCol}.${currentBaseMap === 'Hybrid' ? 'png' : 'jpeg'}`,
      layer: currentBaseMap === 'Hybrid' ? 'Hybrid' : 'Satellite', 
      style: "default", format: currentBaseMap === 'Hybrid' ? "image/png" : "image/jpeg",
      tileMatrixSetID: "EPSG:900913", tilingScheme: new WebMercatorTilingScheme(),
      minimumLevel: 6, maximumLevel: 18
    });
    provider.errorEvent.addEventListener(() => {});
    return provider;
  }, [currentBaseMap, vworldKey]);

  // 3. 고스트 미리보기 데이터 구성
  const ghostBuilding = useMemo(() => {
      if (mode === 'LIBRARY' && selectedLibItem) {
          return {
              id: 'ghost', name: selectedLibItem.name,
              lat: 0, lon: 0, rotation: 0, scale: 1.0, isModel: true, modelUrl: selectedLibItem.modelUrl,
              width: selectedLibItem.defaultWidth || 10, depth: selectedLibItem.defaultDepth || 10, height: selectedLibItem.defaultHeight || 10, 
              altitude: 0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0, originalHeight: selectedLibItem.defaultHeight
          };
      } else if (mode === 'CREATE') {
          return {
              id: 'ghost', name: "Custom Box", lat: 0, lon: 0, rotation: 0, ...inputs, altitude: 0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0
          };
      } else if (mode === 'RELOCATE' && selectedBuilding) {
          return selectedBuilding;
      }
      return null;
  }, [mode, selectedLibItem, inputs, selectedBuilding]);

  return (
    <div className="relative w-full h-screen">
      <Viewer 
        full selectionIndicator={false} infoBox={false} animation={false} timeline={false} shadows={false} 
        terrainProvider={terrainProvider}
      >
        <MapController />
        <MapEventHandler />
        <ImageryLayer imageryProvider={osmProvider} />
        {vworldProvider && <ImageryLayer key={currentBaseMap} imageryProvider={vworldProvider} />}
        
        {/* ✅ OSM 건물 매니저: 지형 로드 후 렌더링 */}
        {showVWorld3D && terrainProvider && <OsmBuildingsManager terrainProvider={terrainProvider} />}

        {children}
        
        <BldgLayer 
           buildings={buildings} 
           selectedId={selectedBuilding ? selectedBuilding.id : null}
           cursorPos={cursorPos}
           ghostBuilding={ghostBuilding as any}
           onUpdateBuilding={updateBuilding} 
        />
        <GreeneryLayer trees={greenery.trees} drawingPoints={greenery.drawingPoints} />
      </Viewer>
      
      {/* UI 레이어 */}
      <MapControlBar /><BldgSimPanel /><BldgInfoCard /><GreenerySimulationPanel />
    </div>
  );
};

export const BaseMapLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <MapProvider>
      <BldgProvider>
        <GreeneryProvider>
          <MapContainer>{children}</MapContainer>
        </GreeneryProvider>
      </BldgProvider>
    </MapProvider>
  );
};