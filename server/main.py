from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from contextlib import asynccontextmanager

from server.config import settings
from server.models import Task, Message, Context, Project, Folder
from server.routes import tasks, messages, contexts, chat, folders
from server.logger import Logger

logger = Logger.get("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting TreeChat API...")
    client = None
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = client[settings.DATABASE_NAME]

        await init_beanie(
            database=database, document_models=[Task, Message, Context, Project, Folder]
        )

        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        logger.warning("Running in limited mode without database")

    logger.info(f"API running at http://{settings.HOST}:{settings.PORT}")
    logger.info(f"API Docs: http://{settings.HOST}:{settings.PORT}/docs")
    yield

    if client:
        client.close()
        logger.info("MongoDB connection closed")


app = FastAPI(
    title="TreeChat API",
    description="AI-powered declarative task and context manager with tree-based chat",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.debug(
        f"{request.method} {request.url.path} - Status: {response.status_code}"
    )
    return response


# Include routers
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(contexts.router, prefix="/api/contexts", tags=["contexts"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(folders.router, prefix="/api/folders", tags=["folders"])


@app.get("/")
async def root():
    return {
        "message": "TreeChat API - AI-powered task manager",
        "version": "0.2.0",
        "features": [
            "Declarative task input",
            "Auto-grouping by domain",
            "Tree-based chat",
            "Time-aware urgency",
            "Natural language queries",
        ],
        "endpoints": {
            "docs": "/docs",
            "tasks": "/api/tasks",
            "chat": "/api/chat",
            "messages": "/api/messages",
            "contexts": "/api/contexts",
            "folders": "/api/folders",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "treechat-api"}
