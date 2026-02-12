FROM node:20-alpine

# 컨테이너 내 작업 디렉토리 생성 (자동 생성됨)
WORKDIR /app

# 의존성 설치 (캐시 최적화)
COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set registry http://registry.npmjs.org/ && \
    npm install

# 소스 복사
COPY . .

# Vite를 0.0.0.0으로 실행하여 외부(Nginx) 접속 허용
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]