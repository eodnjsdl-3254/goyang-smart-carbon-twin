import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Viewer, ImageryLayer, useCesium, ScreenSpaceEventHandler, ScreenSpaceEvent } from 'resium';
import { 
  Cartesian3, OpenStreetMapImageryProvider, WebMapTileServiceImageryProvider, 
  WebMercatorTilingScheme, createWorldTerrainAsync, TerrainProvider, Ion,
  createOsmBuildingsAsync, Cesium3DTileset as Cesium3DTilesetClass, 
  Cartographic, Matrix4, ScreenSpaceEventType, Math as CesiumMath, Color,
  Entity 
} from 'cesium';

import { MapControlBar } from '@/features/map/components/MapControlBar'; 
import { useMapContext, MapProvider } from '@/features/map/context/MapContext';

// [수정 포인트 1] Bldg 관련 컴포넌트들의 경로를 최신 구조에 맞게 수정
import { 
  BldgLayer, 
  BldgSimPanel, 
  BldgInfoCard, 
  BuildingTag, 
} from '@/features/bldg';
import { BldgProvider, useBldgContext } from '@/features/bldg/context/BldgContext';

// 녹지 관련 (경로 유지)
import { GreeneryLayer } from '@/features/green-space/components/GreeneryLayer';
import { GreenerySimPanel} from '@/features/green-space/components/GreenerySimPanel';
import { GreeneryProvider, useGreeneryContext } from '@/features/green-space/context/GreeneryContext';

const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;
Ion.defaultAccessToken = CESIUM_TOKEN;

// 1. 이벤트 핸들러 (좌표 픽킹 및 모드별 동작)
const MapEventHandler = () => {
  const { viewer } = useCesium();
  // ✅ Context에서 필요한 함수만 가져옴 (selectBuildingObj 삭제됨)
  const { handleMapClick, handleMouseMove, mode, setSelectedBuildingId } = useBldgContext();
  const greenery = useGreeneryContext();

  // 안전한 좌표 추출 (Ghost 떨림 방지)
  const getSafePickPosition = useCallback((position: any) => {
      if (!viewer) return null;
      const ray = viewer.camera.getPickRay(position);
      if (!ray) return null;
      return viewer.scene.globe.pick(ray, viewer.scene);
  }, [viewer]);

  const onLeftClick = useCallback((movement: any) => {
    if (!viewer) return;

    // [IDLE 모드] 객체 선택 로직
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

          // Ghost가 아닌 실제 건물만 선택
          if (pickedId && typeof pickedId === 'string' && !pickedId.includes('ghost')) {
            setSelectedBuildingId(pickedId); // ✅ 올바른 함수 사용
            return; 
          }
      }
      // 빈 곳 클릭 시 선택 해제 (단, 녹지 그리기 중엔 해제 안 함)
      if (!greenery.isDrawing) setSelectedBuildingId(null);
    }

    // [공통] 좌표 클릭 로직
    const cartesian = getSafePickPosition(movement.position);
    
    if (cartesian) {
      const cartographic = Cartographic.fromCartesian(cartesian);
      const lat = CesiumMath.toDegrees(cartographic.latitude);
      const lon = CesiumMath.toDegrees(cartographic.longitude);
      
      if (greenery.isDrawing) {
          const height = cartographic.height;
          greenery.setDrawingPoints((prev: Cartesian3[]) => [...prev, Cartesian3.fromDegrees(lon, lat, height)]);
      } else if (mode !== 'VIEW' && mode !== 'IDLE') {
          handleMapClick({ lat, lon }); // 건물 배치/이동 확정
      }
    }
  }, [viewer, mode, handleMapClick, setSelectedBuildingId, greenery, getSafePickPosition]);

  const onMouseMove = useCallback((movement: any) => {
    if (!viewer) return;
    // 생성, 라이브러리, 이동 모드일 때만 좌표 업데이트 (Ghost 이동용)
    if (mode === 'LIBRARY' || mode === 'CREATE' || mode === 'RELOCATE') {
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

// 2. 맵 컨트롤러 (카메라 이동 등)
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
  useEffect(() => { if (viewer) viewer.scene.globe.depthTestAgainstTerrain = true; }, [viewer]);
  return null;
};

// 3. OSM 빌딩 매니저
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

        // 1. 빌딩 로드 (생성 시점에 옵션을 통해 지표면 밀착 시도)
        osmTileset = await createOsmBuildingsAsync({
          defaultColor: Color.WHITE,
        });

        if (!isMounted || viewer.isDestroyed()) return;

        /**
         * ✅ 세슘 공식 권장 방식: Matrix4 Translation 최적화
         */
        const centerCoords = Cartographic.fromDegrees(126.8322, 37.6583);
        
        const surface = Cartesian3.fromRadians(centerCoords.longitude, centerCoords.latitude, 0.0);
        const offset = Cartesian3.fromRadians(centerCoords.longitude, centerCoords.latitude, -53.0); // 53m 하강
        const translation = Cartesian3.subtract(offset, surface, new Cartesian3());
        
        osmTileset.modelMatrix = Matrix4.fromTranslation(translation);

        viewer.scene.primitives.add(osmTileset);

        removeListener = viewer.scene.preRender.addEventListener(() => {
          if (!osmTileset || osmTileset.isDestroyed()) return;
          const cameraHeight = viewer.camera.positionCartographic.height;
          osmTileset.show = cameraHeight < VISIBLE_HEIGHT_THRESHOLD;
        });

      } catch (e) {
        console.error("❌ OSM 로드 실패:", e);
      }
    };

    loadOsm();

    return () => {
      isMounted = false;
      if (removeListener) removeListener();
      if (viewer && !viewer.isDestroyed() && osmTileset) {
        viewer.scene.primitives.remove(osmTileset);
      }
    };
  }, [viewer, terrainProvider]);

  return null;
};

// 4. 메인 맵 컨테이너
const MapContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
        
        {/* ✅ 레이어 컴포넌트: Props 없이 렌더링 */}
        <BldgLayer />
        <GreeneryLayer />

      </Viewer>
      <MapControlBar />
      <BldgSimPanel />
      <BldgInfoCard />
      <BuildingTag /> {/* [추가] 정밀 편집 태그도 렌더링 */}
      <GreenerySimPanel />
    </div>
  );
};

// 5. Providers 래퍼
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