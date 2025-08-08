from fastapi import APIRouter
from .user_route import router as user_router
from .database_routes import router as database_router
from .pipeline_routes import router as pipeline_router
from .job_routes import router as job_router
from .log_routes import router as log_router

router = APIRouter(prefix="/api/v1")
router.include_router(user_router)
router.include_router(database_router)
router.include_router(pipeline_router)
router.include_router(job_router)
router.include_router(log_router)
