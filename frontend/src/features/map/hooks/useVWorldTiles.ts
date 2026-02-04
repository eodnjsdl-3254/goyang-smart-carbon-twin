import { useEffect, useState } from 'react';
import { Cesium3DTileset, Cartesian3, Cartographic, Matrix4 } from 'cesium';
import { useCesium } from 'resium';

export const useVWorldTiles = (autoLoad: boolean = false) => {
  const { viewer } = useCesium();
  const [tileset, setTileset] = useState<Cesium3DTileset | null>(null);

  const loadTiles = async () => {
    // 1. 이미 로드되었거나 뷰어가 없으면 중단
    if (!viewer || tileset) return; 

    try {
      // V-World 인증키
      const vworldKey = "37B44C3A-8C01-30CE-806E-7D89E87B8473"; 
      
      // 2. heightOffset 옵션을 제거하고 URL만 전달합니다.
      const newTileset = await Cesium3DTileset.fromUrl(
        `https://api.vworld.kr/real3d/wmts/1.0.0/${vworldKey}/tileset.json`
      );

      // 3. 높이 조절이 필요하다면 modelMatrix를 수정합니다.
      // V-World 건물이 지형에 파묻히거나 떠 있을 때 이 값을 조절하세요.
      const heightOffset = 0; // 예: -30 (미터 단위)
      
      if (heightOffset !== 0) {
        const cartographic = Cartographic.fromCartesian(newTileset.boundingSphere.center);
        const surface = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
        const offset = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
        const translation = Cartesian3.subtract(offset, surface, new Cartesian3());
        newTileset.modelMatrix = Matrix4.fromTranslation(translation);
      }

      viewer.scene.primitives.add(newTileset);
      setTileset(newTileset);
      
      viewer.zoomTo(newTileset);
      
      console.log("🏢 V월드 3D 건물 로드 성공");
      
    } catch (error) {
      console.error("❌ 3D 빌딩 로드 실패:", error);
    }
  };

  const removeTiles = () => {
    if (viewer && tileset) {
      viewer.scene.primitives.remove(tileset);
      setTileset(null);
    }
  };

  useEffect(() => {
    if (autoLoad) loadTiles();
    return () => {
       if (autoLoad) removeTiles(); 
    };
  }, [viewer, autoLoad]);

  return { loadTiles, removeTiles, isLoaded: !!tileset };
};