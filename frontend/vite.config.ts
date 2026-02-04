import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // 속도 향상을 위해 SWC 플러그인 권장
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    host: '0.0.0.0', 
    port: 5173,
    hmr: {
      // Nginx(80)를 통해 접속하므로 HMR 소켓 포트를 80으로 고정합니다.
      clientPort: 80 
    },
    proxy: {
      // 1. 내부 Backend (탄소 데이터 및 3D 변환)
      '/api': {
        target: 'http://gsct-backend:8000', // Docker 내부 네트워크 서비스명 사용
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 2. 내부 GeoServer (공간 레이어)
      '/geoserver': {
        target: 'http://gsct-geoserver:8080',
        changeOrigin: true,
      },
      // 3. VWorld API (행정구역/검색 API 등)
      '/vworld-bin': {
        target: 'https://api.vworld.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vworld-bin/, ''),
        secure: false,
        headers: {
          'Referer': 'http://localhost/', // Nginx 게이트웨이 주소에 맞춤
          'Origin': 'http://localhost'
        }
      },
      // 4. VWorld 3D 데이터 (건물/지형 타일)
      '/vworld-data': {
        target: 'https://xdworld.vworld.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vworld-data/, ''),
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Referer', 'https://map.vworld.kr/');
            proxyReq.setHeader('Origin', 'https://map.vworld.kr');
          });
        }
      },
      // 5. OpenStreetMap 타일
      '/osm-tiles': {
        target: 'https://a.tile.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/osm-tiles/, ''),
        headers: {
          'User-Agent': 'GSCT-DigitalTwin-Project/1.0'
        }
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 객체 형태 { cesium: ['cesium'] } 대신 함수형으로 작성하여 에러 해결
        manualChunks: (id) => {
          if (id.includes('node_modules/cesium')) {
            return 'cesium';
          }
        },
      },
    },
  },
});