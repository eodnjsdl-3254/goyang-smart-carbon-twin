# 1. 베이스 이미지 (가벼운 버전)
FROM python:3.11-slim

# 2. 환경 변수 설정
# 파이썬 출력을 버퍼링 없이 바로 터미널에 보여줌 (로그 확인에 필수)
ENV PYTHONUNBUFFERED=1
# .pyc 파일 생성 방지 (도커 이미지 크기 줄임)
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 3. 시스템 패키지 설치 (중요!)
# asyncpg나 geoalchemy 같은 DB 라이브러리는 빌드 시 gcc나 libpq가 필요할 수 있음
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. 소스 코드 복사
COPY . .

# 6. 실행 명령
# --reload 옵션은 개발 시에만 유용하므로 배포/운영 시에는 뺍니다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]