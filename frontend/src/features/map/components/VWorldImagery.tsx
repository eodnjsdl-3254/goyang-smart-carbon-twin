import React, { useMemo } from 'react';
import { ImageryLayer } from 'resium';
import { UrlTemplateImageryProvider, Credit, WebMercatorTilingScheme } from 'cesium';

type VWorldLayerType = 'Base' | 'Satellite' | 'Hybrid';

interface Props {
  type: VWorldLayerType;
  visible?: boolean;
}

export const VWorldImagery: React.FC<Props> = ({ type, visible = true }) => {
  // .env 파일에서 키를 가져오거나, 없으면 기본값 사용
  const API_KEY = import.meta.env.VITE_VWORLD_KEY || "37B44C3A-8C01-30CE-806E-7D89E87B8473";

  const imageryProvider = useMemo(() => {
    const ext = (type === 'Satellite' || type === 'Hybrid') ? 'jpeg' : 'png';
    
    return new UrlTemplateImageryProvider({
      url: `/vworld-bin/req/wmts/1.0.0/${API_KEY}/${type}/{z}/{y}/{x}.${ext}`,
      minimumLevel: 6,
      maximumLevel: 19,
      credit: new Credit("V-World"),
      // [수정 핵심] import 한 클래스를 바로 사용
      tilingScheme: new WebMercatorTilingScheme() 
    });
  }, [type, API_KEY]);

  if (!visible) return null;

  return <ImageryLayer imageryProvider={imageryProvider} />;
};