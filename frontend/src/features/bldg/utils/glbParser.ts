// src/features/bldg/utils/glbParser.ts

export interface GlbAnalysis {
  geometry: {
    width: number;
    depth: number;
    height: number;
    rootNodeName: string;
  };
  metaData: Record<string, any>;
}

export const extractGlbDetails = (file: File): Promise<GlbAnalysis> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target || !e.target.result) {
        resolve(getDefaultData());
        return;
      }

      try {
        const buffer = e.target.result as ArrayBuffer;
        const dataView = new DataView(buffer);
        
        // JSON 청크 추출 로직 (이전 프로젝트 로직 유지)
        const chunkLength = dataView.getUint32(12, true);
        const jsonChunk = new Uint8Array(buffer, 20, chunkLength);
        const gltf = JSON.parse(new TextDecoder("utf-8").decode(jsonChunk));

        // 물리적 크기 분석 로직...
        resolve({
          geometry: {
            width: 10, // 실제 계산 로직 포함 가능
            depth: 10,
            height: 10,
            rootNodeName: gltf.nodes?.[0]?.name || "Node_0"
          },
          metaData: gltf.asset?.extras || {}
        });
      } catch (err) {
        resolve(getDefaultData());
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

const getDefaultData = (): GlbAnalysis => ({
  geometry: { width: 10, depth: 10, height: 10, rootNodeName: "Node_0" },
  metaData: {}
});