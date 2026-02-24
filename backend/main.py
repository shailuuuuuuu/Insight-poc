import os
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
from routers.notifications_router import router as notifications_router
from routers.mtss_router import router as mtss_router
from routers.interventions_router import router as interventions_router
from routers.pd_router import router as pd_router
from routers.pathways_router import router as pathways_router
from routers.executive_router import router as executive_router
from routers.test_builder_router import router as test_builder_router
from routers.workspaces_router import router as workspaces_router
from routers.gamification_router import router as gamification_router
from routers.sel_router import router as sel_router
from routers.predictions_router import router as predictions_router
from routers.assistant_router import router as assistant_router
from routers.parent_router import router as parent_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Insight POC", version="0.1.0", description="CUBED-3 Assessment Platform")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()] if CORS_ORIGINS else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=len(cors_origins) > 0,
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
app.include_router(notifications_router)
app.include_router(mtss_router)
app.include_router(interventions_router)
app.include_router(pd_router)
app.include_router(pathways_router)
app.include_router(executive_router)
app.include_router(test_builder_router)
app.include_router(workspaces_router)
app.include_router(gamification_router)
app.include_router(sel_router)
app.include_router(predictions_router)
app.include_router(assistant_router)
app.include_router(parent_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
