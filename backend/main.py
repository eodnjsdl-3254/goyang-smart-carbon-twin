import os
import uuid
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, BigInteger, select, JSON, DateTime, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import asynccontextmanager

# --- [1. 데이터베이스 설정] ---
DATABASE_URL = "postgresql+asyncpg://docker:docker@db:5432/gisdb"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# --- [2. DB 모델 정의 (ORM)] ---

class SimModelInfo(Base):
    __tablename__ = "tbd_simlatn_model_info"
    __table_args__ = {"schema": "cbn"} 

    mlid = Column(BigInteger, primary_key=True, index=True)
    model_type = Column(String)       
    model_save_file_url = Column(String) 
    thumb_save_url = Column(String)      
    model_org_file_name = Column(String) 

class SimSceneInfo(Base):
    __tablename__ = "tbd_simlatn_scene_info"
    __table_args__ = {"schema": "cbn"}

    scene_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    scene_name = Column(String(200), nullable=False)
    scene_data = Column(JSON, nullable=False)
    user_id = Column(String(50), default="guest")
    reg_date = Column(DateTime, default=func.now())

# --- [3. Pydantic 스키마] ---

class LibraryItemResponse(BaseModel):
    id: str
    name: str
    category: str
    thumbnail: Optional[str] = None
    modelUrl: Optional[str] = None
    defaultWidth: float
    defaultDepth: float
    defaultHeight: float

class SceneCreateRequest(BaseModel):
    scene_name: str
    user_id: Optional[str] = "guest"
    scene_data: Dict[str, Any] 

class SceneListResponse(BaseModel):
    scene_id: int
    scene_name: str
    user_id: str
    reg_date: datetime

    class Config:
        from_attributes = True

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 실행
    async with engine.begin() as conn:
        await conn.execute(func.text("CREATE SCHEMA IF NOT EXISTS cbn"))
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables initialized.")
    yield

# --- [App 설정] ---
app = FastAPI(title="Goyang Smart Carbon Twin API", lifespan=lifespan)

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

@app.get("/simulation/buildings", response_model=List[LibraryItemResponse])
async def get_building_library(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(SimModelInfo))
        models = result.scalars().all()

        library_items = []
        for m in models:
            item = LibraryItemResponse(
                id=str(m.mlid),
                name=m.model_org_file_name,
                category=m.model_type,
                thumbnail=m.thumb_save_url,
                modelUrl=m.model_save_file_url,
                defaultWidth=20.0,
                defaultDepth=20.0,
                defaultHeight=30.0 
            )
            library_items.append(item)
            
        return library_items
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return []

# --- [파일 업로드 및 변환 API (Assimp 기반으로 롤백)] ---

@app.post("/simulation/upload")
async def upload_glb_model(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    model_type: str = Form("building"),
    db: AsyncSession = Depends(get_db)
):
    UPLOAD_DIR = "/app/files"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_ext = os.path.splitext(file.filename)[1]
    if file_ext.lower() != ".glb":
        raise HTTPException(status_code=400, detail="GLB 파일만 업로드 가능합니다.")

    save_filename = f"{uuid.uuid4()}{file_ext}"
    save_path = os.path.join(UPLOAD_DIR, save_filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        new_model = SimModelInfo(
            model_type=model_type,
            model_save_file_url=f"/{save_filename}",
            model_org_file_name=model_name,
            thumb_save_url=None
        )
        db.add(new_model)
        await db.commit()
        await db.refresh(new_model)

        return {
            "status": "success",
            "model_id": new_model.mlid,
            "url": f"/files/{save_filename}"
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"DB 저장 실패: {str(e)}")

@app.post("/simulation/convert")
async def convert_3ds_to_glb(
    files: List[UploadFile] = File(...),
    model_name: str = Form(...),
    model_type: str = Form("building"),
    db: AsyncSession = Depends(get_db)
):
    """
    Assimp를 사용하여 3DS 파일을 GLB로 변환합니다. (Blender 4.2+ 3DS 미지원 이슈로 롤백)
    """
    UPLOAD_DIR = "/app/files"
    task_id = str(uuid.uuid4())
    
    with tempfile.TemporaryDirectory() as temp_dir:
        target_3ds = None
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            if file.filename.lower().endswith(".3ds"):
                target_3ds = file.filename

        if not target_3ds:
            raise HTTPException(status_code=400, detail="3DS 파일이 포함되어야 합니다.")

        output_filename = f"{task_id}.glb"
        output_path = os.path.join(temp_dir, output_filename)

        try:
            # assimp export <input> <output>
            process = subprocess.run(
                ["assimp", "export", os.path.join(temp_dir, target_3ds), output_path],
                capture_output=True,
                text=True
            )
            
            if process.returncode != 0:
                print(f"❌ Assimp Error: {process.stderr}")
                raise HTTPException(status_code=500, detail=f"변환 실패: {process.stderr}")
            
            print(f"✅ Assimp Output: {process.stdout}")
            
        except Exception as e:
            print(f"❌ Conversion Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"변환 중 오류: {str(e)}")

        final_save_path = os.path.join(UPLOAD_DIR, output_filename)
        shutil.move(output_path, final_save_path)

        try:
            new_model = SimModelInfo(
                model_type=model_type,
                model_save_file_url=f"/{output_filename}",
                model_org_file_name=model_name,
                thumb_save_url=None
            )
            db.add(new_model)
            await db.commit()
            await db.refresh(new_model)

            return {
                "status": "success",
                "model_id": new_model.mlid,
                "url": f"/files/{output_filename}"
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"DB 저장 실패: {str(e)}")

# --- [시나리오(Scene) 관련 API] ---

@app.post("/scenes", response_model=Dict[str, Any])
async def create_scene(req: SceneCreateRequest, db: AsyncSession = Depends(get_db)):
    try:
        new_scene = SimSceneInfo(
            scene_name=req.scene_name,
            user_id=req.user_id,
            scene_data=req.scene_data
        )
        db.add(new_scene)
        await db.commit()
        await db.refresh(new_scene)
        return {"status": "success", "scene_id": new_scene.scene_id, "message": "성공"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/scenes", response_model=List[SceneListResponse])
async def get_scene_list(db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(SimSceneInfo).order_by(SimSceneInfo.reg_date.desc())
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        return []

@app.get("/scenes/{scene_id}")
async def get_scene_detail(scene_id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(SimSceneInfo).where(SimSceneInfo.scene_id == scene_id)
        result = await db.execute(stmt)
        scene = result.scalar_one_or_none()
        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")

        geojson_data = dict(scene.scene_data) 
        features = geojson_data.get("features", [])
        mlid_set = {int(f["properties"]["mlid"]) for f in features if "mlid" in f["properties"] and f["properties"]["mlid"]}
        
        model_url_map = {}
        if mlid_set:
            model_stmt = select(SimModelInfo).where(SimModelInfo.mlid.in_(mlid_set))
            model_result = await db.execute(model_stmt)
            for m in model_result.scalars().all():
                url = m.model_save_file_url
                if url and not url.startswith("http"):
                    url = f"/files{url}" if url.startswith("/") else f"/files/{url}"
                model_url_map[m.mlid] = url

        for feature in features:
            m_id = feature["properties"].get("mlid")
            if m_id and int(m_id) in model_url_map:
                feature["properties"]["modelUrl"] = model_url_map[int(m_id)]
        
        return {"scene_id": scene.scene_id, "scene_name": scene.scene_name, "reg_date": scene.reg_date, "scene_data": geojson_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulation/green")
async def simulate_green_space(req: GreenSimRequest):
    rate = {"pine": 0.1, "oak": 0.15, "ginkgo": 0.12}.get(req.tree_type, 0.1)
    return {
        "simulation_id": str(uuid.uuid4()),
        "status": "success",
        "result": {"estimated_carbon_absorption": round(req.count * rate, 3)}
    }
