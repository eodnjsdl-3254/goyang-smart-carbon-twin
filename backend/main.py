import os
import uuid
from datetime import datetime  # [수정] 날짜 처리를 위해 추가
from typing import List, Optional, Dict, Any # [수정] Dict, Any 추가
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, BigInteger, select, JSON, DateTime, func
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

# 2-1. 모델(라이브러리) 정보 테이블
class SimModelInfo(Base):
    __tablename__ = "tbd_simlatn_model_info"
    __table_args__ = {"schema": "cbn"} 

    mlid = Column(BigInteger, primary_key=True, index=True)
    model_type = Column(String)       
    model_save_file_url = Column(String) 
    thumb_save_url = Column(String)      
    model_org_file_name = Column(String) 

# 2-2. 시나리오(Scene) 정보 테이블
class SimSceneInfo(Base):
    __tablename__ = "tbd_simlatn_scene_info"
    __table_args__ = {"schema": "cbn"}

    scene_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    scene_name = Column(String(200), nullable=False)
    scene_data = Column(JSON, nullable=False) # Postgres JSONB 타입 매핑
    user_id = Column(String(50), default="guest")
    reg_date = Column(DateTime, default=func.now()) # 현재 시간 자동 입력


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

# [복구] 시나리오 저장 요청 DTO
class SceneCreateRequest(BaseModel):
    scene_name: str
    user_id: Optional[str] = "guest"
    scene_data: Dict[str, Any] 

# [복구] 시나리오 목록 응답 DTO
class SceneListResponse(BaseModel):
    scene_id: int
    scene_name: str
    user_id: str
    reg_date: datetime

    class Config:
        from_attributes = True

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


# =========================================================
# 시나리오(Scene) 관련 API
# =========================================================

# 4-1. 시나리오 저장 (GeoJSON 저장)
@app.post("/scenes", response_model=Dict[str, Any])
async def create_scene(req: SceneCreateRequest, db: AsyncSession = Depends(get_db)):
    """
    프론트엔드에서 구성한 GeoJSON(건물+녹지)을 DB에 저장합니다.
    """
    try:
        new_scene = SimSceneInfo(
            scene_name=req.scene_name,
            user_id=req.user_id,
            scene_data=req.scene_data # Pydantic Dict -> JSONB 자동 변환
        )
        
        db.add(new_scene)
        await db.commit()
        await db.refresh(new_scene) # 생성된 scene_id를 가져오기 위해 리프레시
        
        return {
            "status": "success",
            "scene_id": new_scene.scene_id,
            "message": "시나리오가 성공적으로 저장되었습니다."
        }
    except Exception as e:
        await db.rollback()
        print(f"❌ Scene Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4-2. 시나리오 목록 조회
@app.get("/scenes", response_model=List[SceneListResponse])
async def get_scene_list(db: AsyncSession = Depends(get_db)):
    """
    저장된 시나리오 목록을 날짜 내림차순으로 조회합니다. (상세 데이터 제외)
    """
    try:
        # scene_data 컬럼은 무거우므로 제외하고 조회하는 것이 효율적이나, 
        # ORM에서는 deferred 로딩 설정을 안했으면 다 가져옵니다. 
        # 간단하게 전체 조회 후 Pydantic(SceneListResponse)이 필터링하게 합니다.
        stmt = select(SimSceneInfo).order_by(SimSceneInfo.reg_date.desc())
        result = await db.execute(stmt)
        scenes = result.scalars().all()
        return scenes
    except Exception as e:
        print(f"❌ Scene List Error: {e}")
        return []

# 4-3. 시나리오 상세 조회 (Load & Inject URL)
@app.get("/scenes/{scene_id}")
async def get_scene_detail(scene_id: int, db: AsyncSession = Depends(get_db)):
    """
    특정 시나리오를 불러옵니다.
    [중요] 저장된 GeoJSON의 features를 순회하며 mlid에 해당하는 modelUrl을 DB에서 찾아 주입합니다.
    """
    try:
        # 1. 시나리오 조회
        stmt = select(SimSceneInfo).where(SimSceneInfo.scene_id == scene_id)
        result = await db.execute(stmt)
        scene = result.scalar_one_or_none()

        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")

        # GeoJSON 데이터 복사 (원본 수정 방지)
        geojson_data = dict(scene.scene_data) 
        
        # 2. GeoJSON 내부에서 필요한 mlid(모델 ID) 추출
        features = geojson_data.get("features", [])
        mlid_set = set()
        
        for feature in features:
            props = feature.get("properties", {})
            # 'mlid'가 존재하고 값이 있는 경우 수집
            if "mlid" in props and props["mlid"]:
                try:
                    mlid_set.add(int(props["mlid"]))
                except:
                    pass

        # 3. 추출한 ID들에 대한 모델 정보(URL) 일괄 조회 (Bulk Query)
        model_url_map = {}
        if mlid_set:
            model_stmt = select(SimModelInfo).where(SimModelInfo.mlid.in_(mlid_set))
            model_result = await db.execute(model_stmt)
            models = model_result.scalars().all()
            
            # ID -> URL 매핑 생성
            for m in models:
                # DB에 저장된 경로가 절대 경로인지 상대 경로인지에 따라 처리
                # 예: /files/tree.glb -> http://localhost/files/tree.glb
                # (프론트엔드 상황에 맞춰 도메인/포트 처리 필요, 여기선 DB값 그대로 사용 가정하거나 예시처럼 처리)
                url = m.model_save_file_url
                if url and not url.startswith("http"):
                     # 로컬 개발 환경 예시 (Nginx 또는 Static Mount 필요)
                     # 실제 운영환경에 맞게 수정 필요
                     url = f"http://localhost/files{url}" if url.startswith("/") else f"http://localhost/files/{url}"
                
                model_url_map[m.mlid] = url

        # 4. GeoJSON에 modelUrl 주입 (Data Hydration)
        for feature in features:
            props = feature.get("properties", {})
            m_id = props.get("mlid")
            
            if m_id:
                try:
                    m_id_int = int(m_id)
                    if m_id_int in model_url_map:
                        props["modelUrl"] = model_url_map[m_id_int]
                        # feature 업데이트
                        feature["properties"] = props
                except:
                    continue
        
        # 업데이트된 GeoJSON 반환
        geojson_data["features"] = features
        
        return {
            "scene_id": scene.scene_id,
            "scene_name": scene.scene_name,
            "reg_date": scene.reg_date,
            "scene_data": geojson_data
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Scene Load Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to load scene")

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