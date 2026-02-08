import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import cesium from 'vite-plugin-cesium';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    cesium()
  ],
  resolve: {
    alias: {
      // '@'를 src 폴더의 절대 경로로 연결하여 경로 관리를 용이하게 합니다.
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Nginx 컨테이너 등 외부에서 접근할 수 있도록 모든 네트워크 인터페이스를 허용합니다.
    host: '0.0.0.0', 
    port: 5173,
    strictPort: true, // 설정된 포트가 이미 사용 중일 경우 에러를 내어 Nginx와의 포트 불일치를 방지합니다.
    allowedHosts: true,
    
    hmr: {
      // 사용자는 Nginx(80포트)를 통해 접속하므로 브라우저의 웹소켓 연결 포트를 80으로 고정합니다.
      clientPort: 80 
    },
    
    // Cross-Origin Resource Sharing을 허용하여 Nginx 프록시 환경에서 리소스 요청을 원활하게 합니다.
    cors: true,
    
    // WSL2 환경에서 파일 변경 감지가 안 되는 문제를 해결하기 위해 폴링(Polling) 방식을 활성화합니다.
    watch: {
      usePolling: true,
    }
  },
  build: {
    // Cesium과 같은 대용량 라이브러리 사용 시 발생하는 청크 사이즈 경고 수치를 조절합니다.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Cesium 라이브러리를 별도의 파일로 분리하여 초기 로딩 성능을 최적화합니다.
        manualChunks: (id) => {
          if (id.includes('node_modules/cesium')) {
            return 'cesium';
          }
        },
      },
    },
  },
});