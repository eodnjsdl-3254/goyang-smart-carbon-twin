import { useEffect, useState, useCallback } from 'react';
import { Cesium3DTileset, Cartesian3, Cartographic, Matrix4, Math as CesiumMath } from 'cesium';
import { useCesium } from 'resium';

export const useVWorld3DTiles = (visible: boolean) => {
  const { viewer } = useCesium();
  const [tileset, setTileset] = useState<Cesium3DTileset | null>(null);

  // 높이 보정 로직 (레거시 코드 adjustHeight 이식)
  const adjustHeight = useCallback((tileset: Cesium3DTileset, heightOffset: number) => {
    const cartographic = Cartographic.fromCartesian(tileset.boundingSphere.center);
    const surface = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
    const offset = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
    const translation = Cartesian3.subtract(offset, surface, new Cartesian3());
    tileset.modelMatrix = Matrix4.fromTranslation(translation);
    console.log(`📏 V-World 건물 높이 보정 완료: ${heightOffset}m`);
  }, []);

  useEffect(() => {
    if (!viewer || !visible) {
      // visible이 false면 타일셋 숨김 (또는 제거)
      if (tileset) tileset.show = false;
      return;
    }

    // 이미 로드되어 있다면 보여주기만 함
    if (tileset) {
      tileset.show = true;
      return;
    }

    const load = async () => {
      try {
        console.log("🇰🇷 V-World 3D 데이터 로드 시도...");
        
        // 프록시 경로 사용 (/vworld-data)
        const tilesetUrl = "/vworld-data/TDServer/services/facility_build/tileset.json";
        
        const newTileset = await Cesium3DTileset.fromUrl(tilesetUrl, {
          maximumScreenSpaceError: 16,
          skipLevelOfDetail: true,
        });

        viewer.scene.primitives.add(newTileset);
        
        // 높이 보정 적용 (예: 100m가 아닌 실제 지형에 맞게 -30m 등 조정 필요할 수 있음)
        adjustHeight(newTileset, 0); // 필요 시 값 조정

        setTileset(newTileset);

        // 초기 카메라 이동        
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(126.8320, 37.6585, 1000),
          orientation: { heading: 0, pitch: CesiumMath.toRadians(-45), roll: 0 }
        });
        
      } catch (e) {
        console.warn("⚠️ V-World 3D 로드 실패 (CORS 또는 프록시 확인 필요):", e);
      }
    };

    load();

    // Cleanup: 컴포넌트 언마운트 시 타일셋 제거
    return () => {
      if (tileset && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(tileset);
      }
    };
  }, [viewer, visible, adjustHeight]); // tileset은 의존성에서 제외하여 무한 루프 방지

  return { isLoaded: !!tileset };
};