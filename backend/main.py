import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, BigInteger, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# --- [1. 데이터베이스 설정] ---
# Docker Compose 서비스명 'db' 사용 (user:password@host:port/dbname)
DATABASE_URL = "postgresql+asyncpg://docker:docker@db:5432/gisdb"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# DB 세션 의존성 주입 함수
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# --- [2. DB 모델 정의 (ORM)] ---
# 제공해주신 DDL(cbn.tbd_simlatn_model_info)과 매핑
class SimModelInfo(Base):
    __tablename__ = "tbd_simlatn_model_info"
    __table_args__ = {"schema": "cbn"}  # 스키마 지정 필수

    mlid = Column(BigInteger, primary_key=True, index=True)
    model_type = Column(String)       # 건물 용도 등
    model_save_file_url = Column(String) # GLB 파일 URL
    thumb_save_url = Column(String)      # 썸네일 URL
    model_org_file_name = Column(String) # 원본 파일명 (이름으로 사용)
    
    # DB에 없는 필드는 API에서 기본값 처리하거나 컬럼 추가 필요
    # 현재는 DB에 없으므로 매핑 생략

# --- [3. Pydantic 스키마 (프론트엔드 응답용)] ---
class LibraryItemResponse(BaseModel):
    id: str
    name: str
    category: str
    thumbnail: Optional[str] = None
    modelUrl: Optional[str] = None
    defaultWidth: float
    defaultDepth: float
    defaultHeight: float

# 기존 요청 데이터 모델들
class BuildingSimRequest(BaseModel):
    latitude: float
    longitude: float
    building_type: str
    floors: int
    area_m2: float
    model_id: Optional[str] = None

class GreenSimRequest(BaseModel):
    latitude: float
    longitude: float
    tree_type: str
    count: int
    area_m2: float

# --- [App 설정] ---
app = FastAPI(title="Goyang Smart Carbon Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Goyang Smart Carbon Twin Backend is Running!"}

# --- [4. API 엔드포인트 구현] ---

# 라이브러리 목록 조회 API
@app.get("/simulation/buildings", response_model=List[LibraryItemResponse])
async def get_building_library(db: AsyncSession = Depends(get_db)):
    """
    DB(cbn.tbd_simlatn_model_info)에서 건물 모델 목록을 조회합니다.
    """
    try:
        # DB 쿼리 실행
        result = await db.execute(select(SimModelInfo))
        models = result.scalars().all()

        library_items = []
        for m in models:
            # DB 컬럼 -> 프론트엔드 필드 매핑
            item = LibraryItemResponse(
                id=str(m.mlid),
                name=m.model_org_file_name, # 파일명을 이름으로 사용
                category=m.model_type,      # model_type을 카테고리로 사용
                thumbnail=m.thumb_save_url,
                modelUrl=m.model_save_file_url,
                # DB에 크기 정보가 없으므로 임의의 기본값 설정 (추후 DB 컬럼 추가 권장)
                defaultWidth=20.0,
                defaultDepth=20.0,
                defaultHeight=30.0 
            )
            library_items.append(item)
            
        return library_items

    except Exception as e:
        print(f"❌ DB Error: {e}")
        # DB가 비어있거나 에러가 나도 프론트엔드가 죽지 않게 빈 배열 반환 (또는 500 에러)
        return []

@app.post("/simulation/green")
async def simulate_green_space(req: GreenSimRequest):
    print(f"🌲 녹지 시뮬레이션 요청: {req.tree_type}, {req.count}그루")
    absorption_rates = {"pine": 0.1, "oak": 0.15, "ginkgo": 0.12}
    rate = absorption_rates.get(req.tree_type, 0.1)
    total_absorption = req.count * rate

    return {
        "simulation_id": str(uuid.uuid4()),
        "status": "success",
        "input": req.dict(),
        "result": {
            "estimated_carbon_absorption": round(total_absorption, 3),
            "cooling_effect_score": 85,
            "message": f"{req.tree_type} {req.count}그루 식재 시 효과입니다."
        }
    }