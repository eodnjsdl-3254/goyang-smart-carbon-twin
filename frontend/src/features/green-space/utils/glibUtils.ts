import { Model } from 'cesium';

/**
 * GLB URL을 받아 모델을 로드하여 크기를 계산합니다.
 * 최신 Cesium API(Model.fromGltfAsync)를 사용합니다.
 */
export const getGlbDimensions = async (url: string): Promise<{ width: number, depth: number, height: number, area: number } | null> => {
  try {
    // 1. [수정] Model.fromGltfAsync 사용 (비동기 로드)
    const model = await Model.fromGltfAsync({
      url: url,
      scale: 1.0,
      incrementallyLoadTextures: false, // 텍스처 로딩 생략 (속도 향상)
    });

    // 2. 경계 구(Bounding Sphere) 획득
    const bbox = model.boundingSphere; 
    const radius = bbox.radius;

    // 간단하게 구의 지름을 기준으로 계산 (Bounding Box보다 계산이 빠르고 안전함)
    const width = radius * 2;
    const depth = radius * 2;
    const height = radius * 2;

    // 분석 끝났으면 메모리 해제 (중요)
    if (!model.isDestroyed()) {
       model.destroy();
    }

    console.log(`📏 GLB 분석 완료 (${url}): ${width.toFixed(2)}m x ${depth.toFixed(2)}m`);

    return {
      width,
      depth,
      height,
      area: width * depth
    };

  } catch (err) {
    console.error("GLB 분석 실패:", err);
    return null;
  }
};