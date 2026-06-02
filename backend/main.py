import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from config.database import connect_db, close_db
from config.redis import redis_client
from routes import auth, chat, health, medicine, admin, doctor, lab_test, product, prescription, analysis, order, consultations, diagnose, diagnosis
from middleware.error_handler import error_handler_middleware
from middleware.rate_limiter import RateLimitMiddleware
import asyncio
import os

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await connect_db()
        print("[OK] Database connected", flush=True)
    except Exception as e:
        print(f"[WARN] Database connection warning: {e}", flush=True)
    
    try:
        await redis_client.connect()
        if redis_client.client:
            print("[OK] Redis connected", flush=True)
        else:
            print("[WARN] Redis unavailable — rate limiting disabled", flush=True)
    except Exception as e:
        print(f"[WARN] Redis connection warning: {e}", flush=True)
    
    # Warm up AI service and RAG embeddings only when explicitly enabled
    if os.getenv("ENABLE_RAG_WARMUP", "false").strip().lower() in ("1", "true", "yes"):
        try:
            from routes.chat import get_ai_service
            ai_svc = get_ai_service()
            if ai_svc.rag_enabled and ai_svc.rag_service:
                asyncio.create_task(ai_svc.rag_service.initialize())
                print("[OK] RAG embedding warm-up started in background", flush=True)
        except Exception as e:
            print(f"[WARN] AI warm-up skipped: {e}", flush=True)
    
    # Start medicine reminder scheduler only when explicitly enabled.
    scheduler_task = None
    if os.getenv("ENABLE_REMINDER_SCHEDULER", "false").strip().lower() in ("1", "true", "yes"):
        try:
            from services.reminder_scheduler import reminder_scheduler

            scheduler_task = asyncio.create_task(reminder_scheduler.start())
            print("[OK] Medicine Reminder Scheduler started", flush=True)
        except Exception as e:
            print(f"[WARN] Reminder scheduler warning: {e}", flush=True)
    
    print("[OK] FastAPI server started successfully", flush=True)
    yield
    
    # Shutdown
    try:
        if scheduler_task:
            from services.reminder_scheduler import reminder_scheduler

            reminder_scheduler.stop()
            scheduler_task.cancel()
            print("[STOP] Medicine Reminder Scheduler stopped", flush=True)
    except:
        pass
    
    await close_db()
    await redis_client.disconnect()
    print("[STOP] FastAPI server shut down", flush=True)

app = FastAPI(
    title="MedAI Healthcare Platform",
    description="AI-powered healthcare platform with medical assistance",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# Allow configuring CORS origins via ALLOWED_ORIGINS env var (comma-separated). Defaults to common localhost ports.
allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:3001")
allowed_origins = [o.strip() for o in allowed.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import native exception handlers and exceptions
from middleware.error_handler import global_exception_handler, validation_exception_handler, http_exception_handler
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Conditionally add rate limiting middleware only if Redis is configured/active
disable_redis = os.getenv("DISABLE_REDIS", "false").strip().lower() in ("1", "true", "yes")
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
is_cloud = bool(os.getenv("RENDER") or os.getenv("VERCEL") or os.getenv("IS_CLOUD"))
is_local_redis = redis_url and ("localhost" in redis_url or "127.0.0.1" in redis_url)

if not disable_redis and not (is_cloud and is_local_redis):
    app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
    print("[INFO] Rate limiting middleware added natively.", flush=True)
else:
    print("[INFO] Rate limiting middleware bypassed (Redis is disabled or unavailable).", flush=True)

# Register native FastAPI exception handlers instead of using Starlette BaseHTTPMiddleware
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(medicine.router, prefix="/api/medicine", tags=["Medicine"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(doctor.router, prefix="/api/doctor", tags=["Doctor"])
app.include_router(lab_test.router, prefix="/api/lab-tests", tags=["Lab Tests"])
app.include_router(product.router, prefix="/api/products", tags=["Products/Pharmacy"])
app.include_router(prescription.router, prefix="/api", tags=["Prescriptions"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["AI Analysis"])
app.include_router(diagnose.router, prefix="/api", tags=["Medical Image Diagnosis"])
app.include_router(diagnosis.router, prefix="/api/diagnosis", tags=["Unified Diagnosis Pipeline"])
app.include_router(order.router, prefix="/api/orders", tags=["Orders"])
app.include_router(consultations.router, prefix="/api/consultations", tags=["Consultations"])

@app.get("/")
async def root():
    return {
        "message": "MedAI Healthcare Platform API",
        "version": "2.0.0",
        "status": "active"
    }


@app.head("/")
async def root_head():
    return None

@app.get("/api/health-check")
async def health_check():
    return {"status": "healthy", "service": "MedAI API"}


@app.head("/api/health-check")
async def health_check_head():
    return None

if __name__ == "__main__":
    import os
    import uvicorn

    # reload=True loads the app twice on Windows and often breaks heavy ML imports; opt-in with UVICORN_RELOAD=1
    _reload = os.getenv("UVICORN_RELOAD", "").strip().lower() in ("1", "true", "yes")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=_reload)
