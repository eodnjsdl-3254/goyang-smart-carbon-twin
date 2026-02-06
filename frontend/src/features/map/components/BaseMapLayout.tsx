import React, { useEffect, useMemo, useState } from 'react';
import { Viewer, ImageryLayer, useCesium } from 'resium';
import { 
  Cartesian3, 
  OpenStreetMapImageryProvider, 
  WebMapTileServiceImageryProvider, 
  WebMercatorTilingScheme,
  createWorldTerrainAsync, 
  TerrainProvider,
  Ion,
  createOsmBuildingsAsync, 
  Cesium3DTileset as Cesium3DTilesetClass,
  Cesium3DTileStyle,
  Cartographic, 
  Matrix4,      
  sampleTerrainMostDetailed 
} from 'cesium';

import { MapControlBar, useMapEvents, useMapContext, MapProvider } from '@/features/map';
import { BldgLayer, BldgSimPanel, BldgInfoCard } from '@/features/bldg';
import { BldgProvider, useBldgContext } from '@/features/bldg/context/BldgContext';
import { GreeneryLayer, GreenerySimulationPanel, GreeneryProvider, useGreeneryContext } from '@/features/green-space';

const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;
Ion.defaultAccessToken = CESIUM_TOKEN;

// ----------------------------------------------------------------------
// 🏗️ OSM 로더
// ----------------------------------------------------------------------
const OsmBuildingsManager: React.FC<{ terrainProvider: TerrainProvider }> = ({ terrainProvider }) => {
  const { viewer } = useCesium();
  const { cameraTarget } = useMapContext();

  // 1:8000 축척 대응 (약 3km 상공)
  const VISIBLE_HEIGHT_THRESHOLD = 3000; 

  useEffect(() => {
    if (!viewer) return;

    let osmTileset: Cesium3DTilesetClass | null = null;
    let isMounted = true; 
    let removeListener: (() => void) | undefined;

    const loadOsm = async () => {
      try {
        // 중복 방지: 이미 로드된 건물이 있다면 중단
        const primitives = viewer.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const p = primitives.get(i);
          if (p instanceof Cesium3DTilesetClass && (p as any)._url && (p as any)._url.includes('osm')) {
            // 이미 존재한다면 새로 로드하지 않고 리턴 (React 재렌더링 방어)
            return;
          }
        }

        console.log("🏗️ [OSM] 건물 생성 중...");
        const tileset = await createOsmBuildingsAsync();
        
        if (!isMounted) return; 
        osmTileset = tileset;
        
        // [1] 스타일: 흰색
        osmTileset.style = new Cesium3DTileStyle({
            color: { conditions: [["true", "color('white', 1.0)"]] }
        });
        
        // [2] 그림자 끄기 (아티팩트 방지)
        (osmTileset as any).shadows = 0; 
        
        // [3] LOD 성능 최적화
        osmTileset.maximumScreenSpaceError = 24; 

        if (!viewer.isDestroyed()) {
            viewer.scene.primitives.add(osmTileset);
            console.log("✅ [OSM] 뷰어에 추가됨");
            
            // 높이 보정 즉시 실행
            updateHeight(osmTileset);

            // [4] LOD 리스너 등록 (카메라 높이에 따라 보임/숨김 토글)
            removeListener = viewer.scene.preRender.addEventListener(() => {
                if (!osmTileset) return;
                const cameraHeight = viewer.camera.positionCartographic.height;
                // 임계값보다 낮을 때(Zoom In)만 표시
                const shouldShow = cameraHeight < VISIBLE_HEIGHT_THRESHOLD;
                if (osmTileset.show !== shouldShow) {
                    osmTileset.show = shouldShow;
                }
            });
        }

      } catch (e) {
        console.error("❌ OSM 로드 실패:", e);
      }
    };

    // 📉 높이 보정 함수
    const updateHeight = async (tileset: Cesium3DTilesetClass) => {
        if (!terrainProvider) return;
        try {
            const targetLon = cameraTarget.lon;
            const targetLat = cameraTarget.lat;
            const cartographic = Cartographic.fromDegrees(targetLon, targetLat);
            const [updatedPos] = await sampleTerrainMostDetailed(terrainProvider, [cartographic]);
            
            if (updatedPos) {
                const terrainHeight = updatedPos.height;
                const dynamicOffset = -terrainHeight; // 지형 높이만큼 내리기

                const surfaceNormal = Cartesian3.fromRadians(updatedPos.longitude, updatedPos.latitude);
                const translation = Cartesian3.multiplyByScalar(
                    Cartesian3.normalize(surfaceNormal, new Cartesian3()), 
                    dynamicOffset, 
                    new Cartesian3()
                );
                tileset.modelMatrix = Matrix4.fromTranslation(translation);
            }
        } catch (e) {
            console.warn("⚠️ 높이 보정 실패:", e);
        }
    };

    loadOsm();

    // 🚨 Cleanup 함수: 버튼 Off 시 건물을 뷰어에서 "삭제"합니다.
    return () => {
      isMounted = false;
      
      // 1. LOD 리스너 해제
      if (removeListener) removeListener(); 
      
      // 2. 뷰어에서 건물 데이터 완전히 제거 (On/Off 토글의 핵심)
      if (viewer && !viewer.isDestroyed() && osmTileset) {
        viewer.scene.primitives.remove(osmTileset);
        console.log("🗑️ [OSM] 뷰어에서 삭제됨 (Button Off)");
      }
    };
  }, [viewer, terrainProvider, cameraTarget.lat, cameraTarget.lon]); 

  return null;
};

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
    if (viewer) {
      viewer.scene.globe.depthTestAgainstTerrain = true;
    }
  }, [viewer]);

  return null;
};

const MapContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { buildings, handleMapClick, mode } = useBldgContext();
  const greenery = useGreeneryContext(); 
  const { currentBaseMap, showVWorld3D, vworldKey } = useMapContext();

  const [terrainProvider, setTerrainProvider] = useState<TerrainProvider | undefined>(undefined);

  useEffect(() => {
    if (!CESIUM_TOKEN) return;

    createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: true
    })
      .then((provider) => {
        console.log("✅ 지형(Terrain) 로드 성공");
        setTerrainProvider(provider);
      })
      .catch((err) => console.error("❌ 지형 로드 실패:", err));
  }, []);

  useMapEvents({
    onMapClick: (coords) => {
      if (greenery.isDrawing) {
        const point = Cartesian3.fromDegrees(coords.lon, coords.lat, coords.height);
        greenery.setDrawingPoints((prev: Cartesian3[]) => [...prev, point]);
      } else {
        handleMapClick(coords);
      }
    },
    mode: greenery.isDrawing ? 'PLACEMENT' : (mode === 'CREATE' || mode === 'UPLOAD' ? 'PLACEMENT' : 'SELECT')
  });

  const osmProvider = useMemo(() => {
    return new OpenStreetMapImageryProvider({ 
      url: "https://a.tile.openstreetmap.org/",
      maximumLevel: 19,
      fileExtension: "png"
    });
  }, []);

  const vworldProvider = useMemo(() => {
    if (currentBaseMap === 'OSM') return null;
    const apiKey = vworldKey || ""; 
    const layer = currentBaseMap === 'Hybrid' ? 'Hybrid' : 'Satellite';
    const provider = new WebMapTileServiceImageryProvider({
      url: `http://api.vworld.kr/req/wmts/1.0.0/${apiKey}/${layer}/{TileMatrix}/{TileRow}/{TileCol}.${layer === 'Hybrid' ? 'png' : 'jpeg'}`,
      layer: layer,
      style: "default",
      format: layer === 'Hybrid' ? "image/png" : "image/jpeg",
      tileMatrixSetID: "EPSG:900913",
      tilingScheme: new WebMercatorTilingScheme(),
      minimumLevel: 6,
      maximumLevel: 19
    });
    provider.errorEvent.addEventListener(() => {});
    return provider;
  }, [currentBaseMap, vworldKey]);

  return (
    <div className="relative w-full h-screen">
      <Viewer 
        full 
        selectionIndicator={false} 
        infoBox={false} 
        animation={false} 
        timeline={false}
        shadows={false}
        terrainProvider={terrainProvider}
      >
        <MapController />

        <ImageryLayer imageryProvider={osmProvider} />

        {vworldProvider && (
          <ImageryLayer 
            key={currentBaseMap} 
            imageryProvider={vworldProvider} 
          />
        )}

        {/* 🚨 showVWorld3D가 false가 되면 OsmBuildingsManager가 언마운트 -> Cleanup 실행 -> 건물 삭제 */}
        {showVWorld3D && terrainProvider && (
          <OsmBuildingsManager terrainProvider={terrainProvider} />
        )}

        {children}
        <BldgLayer buildings={buildings} />
        <GreeneryLayer trees={greenery.trees} drawingPoints={greenery.drawingPoints} />
      </Viewer>
      
      <MapControlBar />
      <BldgSimPanel />
      <BldgInfoCard />
      <GreenerySimulationPanel />
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