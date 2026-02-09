import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Viewer, ImageryLayer, useCesium, ScreenSpaceEventHandler, ScreenSpaceEvent } from 'resium';
import { 
  Cartesian3, OpenStreetMapImageryProvider, WebMapTileServiceImageryProvider, 
  WebMercatorTilingScheme, createWorldTerrainAsync, TerrainProvider, Ion,
  createOsmBuildingsAsync, Cesium3DTileset as Cesium3DTilesetClass, Cesium3DTileStyle,
  Cartographic, Matrix4, sampleTerrainMostDetailed, ScreenSpaceEventType, Math as CesiumMath, Color,
  Entity 
} from 'cesium';

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

const MapEventHandler = () => {
  const { viewer } = useCesium();
  const { handleMapClick, handleMouseMove, selectBuildingObj, mode, setSelectedBuildingId } = useBldgContext();
  const greenery = useGreeneryContext();

  // 🛠️ [핵심] Ghost 간섭 없는 완벽한 좌표 추출 함수
  const getSafePickPosition = useCallback((position: any) => {
      if (!viewer) return null;
      
      // 1. 레이(Ray) 생성: 카메라에서 마우스 위치로 쏘는 광선
      const ray = viewer.camera.getPickRay(position);
      if (!ray) return null;

      // 2. 지형(Globe)과 충돌하는 지점 계산
      // 이 방식은 화면에 그려진 박스(Entity)나 모델을 완전히 무시하고
      // 오직 '땅(Terrain)'의 좌표만 가져오므로 위치 밀림이 발생하지 않습니다.
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);

      return cartesian;
  }, [viewer]);

  const onLeftClick = useCallback((movement: any) => {
    if (!viewer) return;

    if (mode === 'IDLE') {
      const pickedObject = viewer.scene.pick(movement.position);
      
      if (pickedObject) {
         let pickedId = null;
         if (pickedObject.id instanceof Entity) {
             pickedId = pickedObject.id.id; 
         } else if (typeof pickedObject.id === 'string') {
             pickedId = pickedObject.id;
         } else if (pickedObject.primitive && typeof pickedObject.primitive.id === 'string') {
             pickedId = pickedObject.primitive.id;
         }

         if (pickedId && typeof pickedId === 'string' && !pickedId.includes('ghost')) {
            selectBuildingObj(pickedId); 
            return; 
         }
      }
      if (!greenery.isDrawing) setSelectedBuildingId(null);
    }

    // 🛠️ 수정된 안전 좌표 함수 사용
    const cartesian = getSafePickPosition(movement.position);
    
    if (cartesian) {
      const cartographic = Cartographic.fromCartesian(cartesian);
      const lat = CesiumMath.toDegrees(cartographic.latitude);
      const lon = CesiumMath.toDegrees(cartographic.longitude);
      
      // 높이는 0으로 고정하거나 지형 높이 사용 (여기선 위도/경도만 전달)
      if (greenery.isDrawing) {
         const height = cartographic.height;
         greenery.setDrawingPoints((prev: Cartesian3[]) => [...prev, Cartesian3.fromDegrees(lon, lat, height)]);
      } else if (mode !== 'VIEW' && mode !== 'IDLE') {
         handleMapClick({ lat, lon }); 
      }
    }
  }, [viewer, mode, handleMapClick, selectBuildingObj, setSelectedBuildingId, greenery, getSafePickPosition]);

  const onMouseMove = useCallback((movement: any) => {
    if (!viewer) return;
    if (mode === 'LIBRARY' || mode === 'CREATE' || mode === 'RELOCATE') {
        // 🛠️ 마우스 이동 시에도 레이캐스팅 좌표 사용 -> Ghost가 마우스 따라다닐 때 떨림 방지
        const cartesian = getSafePickPosition(movement.endPosition);
        if (cartesian) {
            const cartographic = Cartographic.fromCartesian(cartesian);
            handleMouseMove({ 
              lat: CesiumMath.toDegrees(cartographic.latitude), 
              lon: CesiumMath.toDegrees(cartographic.longitude) 
            });
        }
    }
  }, [viewer, mode, handleMouseMove, getSafePickPosition]);

  return (
    <ScreenSpaceEventHandler>
      <ScreenSpaceEvent type={ScreenSpaceEventType.LEFT_CLICK} action={onLeftClick} />
      <ScreenSpaceEvent type={ScreenSpaceEventType.MOUSE_MOVE} action={onMouseMove} />
    </ScreenSpaceEventHandler>
  );
};

// ... (MapController, OsmBuildingsManager는 변경 없음 - 기존 코드 유지)

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

        const centerCartesian = osmTileset.boundingSphere.center;
        const centerCartographic = Cartographic.fromCartesian(centerCartesian);
        const [terrainSample] = await sampleTerrainMostDetailed(terrainProvider, [centerCartographic]);

        if (terrainSample && isMounted && osmTileset) {
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

const MapContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { buildings, selectedBuilding, cursorPos, mode, selectedLibItem, inputs, updateBuilding, rotation } = useBldgContext();
  const greenery = useGreeneryContext(); 
  const { currentBaseMap, showVWorld3D, vworldKey } = useMapContext();
  const [terrainProvider, setTerrainProvider] = useState<TerrainProvider | undefined>(undefined);

  useEffect(() => {
    if (!CESIUM_TOKEN) return;
    createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: true })
      .then(setTerrainProvider)
      .catch(console.error);
  }, []);

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

  // Ghost Building (미리보기) 구성
  const ghostBuilding = useMemo(() => {
      if (!cursorPos) return null;

      if (mode === 'LIBRARY' && selectedLibItem) {
          return {
              id: 'ghost-library', 
              name: selectedLibItem.name,
              lat: 0, lon: 0, 
              rotation: rotation, 
              isModel: true, modelUrl: selectedLibItem.modelUrl,
              width: selectedLibItem.defaultWidth || 10, depth: selectedLibItem.defaultDepth || 10, height: selectedLibItem.defaultHeight || 10, 
              altitude: 0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0, originalHeight: selectedLibItem.defaultHeight
          };
      } else if (mode === 'CREATE') {
          return {
              id: 'ghost-box', 
              name: "Custom Box", 
              lat: 0, lon: 0, 
              rotation: rotation, 
              ...inputs, 
              altitude: 0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0
          };
      } else if (mode === 'RELOCATE' && selectedBuilding) {
          return selectedBuilding;
      }
      return null;
  }, [mode, selectedLibItem, inputs, selectedBuilding, rotation, cursorPos]); 

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