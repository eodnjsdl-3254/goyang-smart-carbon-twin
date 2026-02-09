import { Model, Viewer } from 'cesium';

export const getGlbDimensions = (url: string, viewer: Viewer): Promise<{ width: number, depth: number, height: number, area: number } | null> => {
  return new Promise((resolve) => {
    if (!viewer) return resolve(null);

    Model.fromGltfAsync({
      url: url,
      scale: 1.0,
      incrementallyLoadTextures: false,
    }).then((model) => {
      model.show = false; 
      viewer.scene.primitives.add(model);

      const removeListener = viewer.scene.postUpdate.addEventListener(() => {
        if (model.ready) {
          const radius = model.boundingSphere.radius;
          // 원형 나무의 경우 지름을 가로/세로로 간주
          const width = radius * 2;
          const depth = radius * 2;
          const height = radius * 2;

          console.log(`📏 GLB 실측 완료: ${width.toFixed(2)}m x ${depth.toFixed(2)}m`);

          removeListener();
          viewer.scene.primitives.remove(model);
          resolve({ width, depth, height, area: width * depth });
        }
      });
    }).catch(() => resolve(null));
  });
};