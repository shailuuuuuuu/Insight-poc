from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers.auth_router import router as auth_router
from routers.students_router import router as students_router
from routers.assessments_router import router as assessments_router
from routers.reports_router import router as reports_router
from routers.users_router import router as users_router
from routers.licenses_router import router as licenses_router
from data.stimulus_api import router as stimulus_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Insight POC", version="0.1.0", description="CUBED-3 Assessment Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(assessments_router)
app.include_router(reports_router)
app.include_router(users_router)
app.include_router(licenses_router)
app.include_router(stimulus_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
