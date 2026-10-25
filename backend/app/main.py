from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.services.seed_data import seed_database_if_empty

# Import routers
from app.api.auth import router as auth_router
from app.api.structures import router as structures_router
from app.api.satellite import router as satellite_router
from app.api.inspections import router as inspections_router
from app.api.analytics import router as analytics_router

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Sentinel-2 Satellite & Offline Field Verification System for Village Water Structures",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for React / Vite frontend and mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories for snapshots and uploaded field photos
app.mount("/static/snapshots", StaticFiles(directory=settings.STATIC_SNAPSHOTS_DIR), name="snapshots")
app.mount("/static/photos", StaticFiles(directory=settings.FIELD_PHOTOS_DIR), name="photos")

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(structures_router, prefix=settings.API_V1_STR)
app.include_router(satellite_router, prefix=settings.API_V1_STR)
app.include_router(inspections_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": "Satellite Analysis & Offline Field Verification for Village Water Bodies",
        "api_docs": "/docs",
        "resolution_limit_hectares": settings.MIN_ASSESSABLE_SIZE_HA
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "online",
        "service": "JalSakshya Backend API",
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
